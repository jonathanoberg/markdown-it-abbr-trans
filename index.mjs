const crypto = require('crypto');
            
 
// Enclose abbreviations in <abbr> tags
//
export default function abbr_plugin (md, md2, options) {
  const configuration = {
    className: 'translation-tooltip',
    childRevealFunction: 'someClickFunction',
    childCloseFunction: 'hideme',
  }
  const escapeRE        = md.utils.escapeRE
  const arrayReplaceAt  = md.utils.arrayReplaceAt

  // ASCII characters in Cc, Sc, Sm, Sk categories we should terminate on;
  // you can check character classes here:
  // http://www.unicode.org/Public/UNIDATA/UnicodeData.txt
  const OTHER_CHARS      = ' \r\n$+<=>^`|~'

  const UNICODE_PUNCT_RE = md.utils.lib.ucmicro.P.source
  const UNICODE_SPACE_RE = md.utils.lib.ucmicro.Z.source

  function abbr_def (state, startLine, endLine, silent) {
    let labelEnd
    let pos = state.bMarks[startLine] + state.tShift[startLine]
    const max = state.eMarks[startLine]

    if (pos + 2 >= max) { return false }

    if (state.src.charCodeAt(pos++) !== 0x2A/* * */) { return false }
    if (state.src.charCodeAt(pos++) !== 0x5B/* [ */) { return false }

    const labelStart = pos

    for (; pos < max; pos++) {
      const ch = state.src.charCodeAt(pos)
      if (ch === 0x5B /* [ */) {
        return false
      } else if (ch === 0x5D /* ] */) {
        labelEnd = pos
        break
      } else if (ch === 0x5C /* \ */) {
        pos++
      }
    }

    if (labelEnd < 0 || state.src.charCodeAt(labelEnd + 1) !== 0x3A/* : */) {
      return false
    }

    if (silent) { return true }

    const label = state.src.slice(labelStart, labelEnd).replace(/\\(.)/g, '$1')
    const title = state.src.slice(labelEnd + 2, max).trim()

    if (label.length === 0) { return false }
    if (title.length === 0) { return false }
    if (!state.env.abbreviations) { state.env.abbreviations = {} }
    // prepend ':' to avoid conflict with Object.prototype members
    if (typeof state.env.abbreviations[':' + label] === 'undefined') {
      state.env.abbreviations[':' + label] = title
    }

    state.line = startLine + 1
    return true
  }

  function abbr_replace (state) {
    const blockTokens = state.tokens;
    
    if (!state.env.translation_dialogs) {
      state.env.translation_dialogs = [];
    }

    if (!state.env.abbreviations) { return }

    const regSimple = new RegExp('(?:' +
      Object.keys(state.env.abbreviations).map(function (x) {
        return x.substr(1).toLowerCase();
      }).sort(function (a, b) {
        return b.length - a.length
      }).map(escapeRE).join('|') +
    ')')

    const regText = '(^|' + UNICODE_PUNCT_RE + '|' + UNICODE_SPACE_RE +
                    '|[' + OTHER_CHARS.split('').map(escapeRE).join('') + '])' +
            '(' + Object.keys(state.env.abbreviations).map(function (x) {
      return x.substr(1).toLowerCase()
    }).sort(function (a, b) {
      return b.length - a.length
    }).map(escapeRE).join('|') + ')' +
            '($|' + UNICODE_PUNCT_RE + '|' + UNICODE_SPACE_RE +
                    '|[' + OTHER_CHARS.split('').map(escapeRE).join('') + '])'

    const reg = new RegExp(regText, 'gi')

    for (let j = 0, l = blockTokens.length; j < l; j++) {
      if (blockTokens[j].type !== 'inline') { continue }
      let tokens = blockTokens[j].children

      // We scan from the end, to keep position when new tags added.
      for (let i = tokens.length - 1; i >= 0; i--) {
        const currentToken = tokens[i]
        if (currentToken.type !== 'text') { continue }

        let pos = 0;
        const text = currentToken.content;
        reg.lastIndex = 0;
        const nodes = [];

        // fast regexp run to determine whether there are any abbreviated words
        // in the current token
        if (!regSimple.test(text)) { continue }

        let m

        while ((m = reg.exec(text))) {
          if (m.index > 0 || m[1].length > 0) {
            const token = new state.Token('text', '', 0)
            token.content = text.slice(pos, m.index + m[1].length)
            nodes.push(token)
          }

          const randomId = crypto.randomBytes(8).toString('hex');
          const translation = state.env.abbreviations[":" + m[2].toLowerCase()];
          let toBeTranslated = m[2];


          
            const token_o = new state.Token('link_open', 'a', 1)
            token_o.attrs = [
                ['class','translation-available'],
                ['data-translation', translation ],
                ['onclick',`${configuration.childRevealFunction}('${randomId}')`],
                ['data-dialog-id',randomId],
            ];
            nodes.push(token_o);

              const token_t = new state.Token('text', '', 0);
              token_t.content = toBeTranslated;
              nodes.push(token_t);
    console.error("#!@",toBeTranslated);
            const token_c = new state.Token('link_close', 'a', -1);
            nodes.push(token_c);
          


          reg.lastIndex -= m[3].length
          pos = reg.lastIndex
          
          state.env.translation_dialogs.push({
              id:randomId,
              untranslated:toBeTranslated,
              translation:translation,
          });
  
        }

        if (!nodes.length) { continue }

        if (pos < text.length) {
          const token = new state.Token('text', '', 0)
          token.content = text.slice(pos)
          nodes.push(token)
        }

        // replace current node
        blockTokens[j].children = tokens = arrayReplaceAt(tokens, i, nodes)
      }
    }
  }
  
      function add_dialogs(state) {
      if (state.env.translation_dialogs) {
          const wrapper_o = new state.Token('span_open', 'span', 1);
          wrapper_o.attrs =[ ['class', configuration.className], ];
          state.tokens.push(wrapper_o);
          
        state.env.translation_dialogs.forEach(dialog=>{
            
            const token_do = new state.Token('dialog_open','dialog',1);
            token_do.attrs = [
              ['id',dialog.id],
              ['onclick',`${configuration.childCloseFunction}('${dialog.id}')`]
            ];
            state.tokens.push(token_do);
            
            let translatedText;
            let detailedTranslation;
            if (dialog.translation[0] === '{') {
              try {
                const trans = JSON.parse(dialog.translation);
                translatedText = trans.literal;
                detailedTranslation = trans;
              } catch (err) {
                translatedText = dialog.translation;
              }
            } else {
              translatedText = dialog.translation;
            }
            
              const token_h1o = new state.Token('h1_open','h1',1);
              state.tokens.push(token_h1o);
                const token_t2 = new state.Token('text', '', 0);
                token_t2.content = 'Spanish Translation';
                state.tokens.push(token_t2);
              const token_h1c = new state.Token('h1_close','h1',-1);
              state.tokens.push(token_h1c)

              const token_dfno = new state.Token('dfn_open','dfn',1);
              state.tokens.push(token_dfno);
                const token_t5 = new state.Token('text', '', 0);
                token_t5.content = dialog.untranslated;
                state.tokens.push(token_t5);
              const token_dfnc = new state.Token('dfn_close','dfn',-1);
              state.tokens.push(token_dfnc)


              const token_t3 = new state.Token('text', '', 0);
              token_t3.content = translatedText;
              state.tokens.push(token_t3);
              
              if (detailedTranslation) {
                  if ("genders" in detailedTranslation) {
                    const token_tip1o = new state.Token("div_open", "div", 1);
                    token_tip1o.attrs = [ [ "class", `translation-gender` ] ];
                    state.tokens.push(token_tip1o);
                    
                    let genderCount = 0;
                    let articleCount = 0;
                    
                    detailedTranslation.genders.forEach(genderRecord=>{
                      const genderSeperator = (genderCount>0) ? ' or ' : '';
                      genderCount++;
                      if ("gender" in genderRecord && "articles" in genderRecord) {
                        const gender = genderRecord.gender;
                        const articles = genderRecord.articles;
                        
                        {
                          state.tokens.push(new state.Token("span_open", "span", 1));
                          const token_t2 = new state.Token("text", "", 0);
                          token_t2.content = `${genderSeperator}${gender}`;
                          state.tokens.push(token_t2);
                          state.tokens.push(new state.Token("span_close", "span", -1));
                        }
                        let articleStart = ' (';
                        if ("s" in articles) {
                          articleCount++;
                          const token_t2 = new state.Token("text", "", 0);
                          token_t2.content = `${articleStart}${articles.s.a}`;
                          articleStart = ', '
                          state.tokens.push(token_t2);
                        }
                        if ("p" in articles) {
                          const token_t2 = new state.Token("text", "", 0);
                          token_t2.content = `${articleStart}${articles.p.a}`;
                          state.tokens.push(token_t2);
                        }


                        {
                          const token_t2 = new state.Token("text", "", 0);
                          token_t2.content = `)`;
                          state.tokens.push(token_t2);
                        }
                      }
                    });

                    state.tokens.push(new state.Token("br", "br", 0));
                    genderCount = 0;
                    detailedTranslation.genders.forEach(genderRecord=>{

                      if ("gender" in genderRecord && "articles" in genderRecord) {
                        const gender = genderRecord.gender;
                        const articles = genderRecord.articles;
                        const genderSeparator = (genderCount>0) ? ', ' : '';
                        let articleSeparator = (articleCount >0) ? ', ' : '';
                        if ("s" in articles) {
                          const token_t2 = new state.Token("text", "", 0);
                          token_t2.content = `${genderSeparator}${articles.s.e}`;
                          state.tokens.push(token_t2);
                        }
                        if ("p" in articles) {
                          let articleSeparator = (articleCount >0) ? ', ' : '';
                          const token_t2 = new state.Token("text", "", 0);
                          token_t2.content = `${articleSeparator}${articles.p.e}`;
                          state.tokens.push(token_t2);
                        }
                      }
                      genderCount++;
                    });
                    
                    const token_tip1c = new state.Token("div_close", "div", -1);
                    state.tokens.push(token_tip1c);

                  }
                      
                  if ("tip" in detailedTranslation) {
                      const token_tip1o = new state.Token("div_open", "div", 1);
                      token_tip1o.attrs = [ [ "class", "translation-tip" ]];
                      state.tokens.push(token_tip1o);
                      const token_t2 = new state.Token("text", "", 0);
                      token_t2.content = detailedTranslation.tip;
                      state.tokens.push(token_t2);
                      state.tokens.push(new state.Token("div_close", "div", -1));
                  }
                  
                  if ("example" in detailedTranslation) {
                      const token_tip1o = new state.Token("fieldset_open", "fieldset", 1);
                      token_tip1o.attrs = [ [ "class", "translation-example" ]];
                      state.tokens.push(token_tip1o);
                      state.tokens.push(new state.Token("legend_open","legend",1));
                      {
                          const token_t2 = new state.Token("text", "", 0);
                          token_t2.content = "Example"
                          state.tokens.push(token_t2);
    
                      }
                      state.tokens.push(new state.Token("legend_close","legend",-1));
                      const token_t2 = new state.Token("text", "", 0);
                      token_t2.content = detailedTranslation.example;
                      state.tokens.push(token_t2);
                      const token_tip1c = new state.Token("fieldset_close", "fieldset", -1);
                      state.tokens.push(token_tip1c);
                    
                  }              
              }
              
              /*
               *
               * Add support for our audio translations...
               * 
               * Build this div using htmx to fill in when needed:
                  <div    
                    hx-post="/app/audio/definition"
                    hx-trigger="revealed"
                    hx-swap="innerHTML"
                    class="definition-audio"
                    hx-vals='{"definition": "<token being translated>"}'
                  /></div>
                *
                */
              {
                    const token_tip1o = new state.Token("div_open", "div", 1);
                    token_tip1o.attrs = [ 
                        [ "hx-post", `/app/audio/definition` ],
                        [ "hx-trigger", `intersect` ],
                        [ "hx-swap", `innerHTML` ],
                        [ "hx-vals", `{"definition":"${dialog.untranslated}"}` ],
                        [ "class", `definition-audio` ],
                      ];
                    state.tokens.push(token_tip1o);
                    state.tokens.push(new state.Token("div_close",'div',-1));

              }
          
            const token_dc = new state.Token('dialog_close','dialog',-1);
            state.tokens.push(token_dc);
 
        });
        
        const wrapper_c = new state.Token('span_close','span',-1);
        state.tokens.push(wrapper_c);
          
        state.env.translation_dialogs = [];
      }
    }

  md.block.ruler.before('reference', 'abbr_def', abbr_def, { alt: ['paragraph', 'reference'] })

  md.core.ruler.after('linkify', 'abbr_replace', abbr_replace)
  md.core.ruler.after('abbr_replace','add_dialogs', add_dialogs)
};

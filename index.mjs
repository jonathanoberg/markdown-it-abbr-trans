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
    const blockTokens = state.tokens

    if (!state.env.abbreviations) { return }

    const regSimple = new RegExp('(?:' +
      Object.keys(state.env.abbreviations).map(function (x) {
        return x.substr(1)
      }).sort(function (a, b) {
        return b.length - a.length
      }).map(escapeRE).join('|') +
    ')')

    const regText = '(^|' + UNICODE_PUNCT_RE + '|' + UNICODE_SPACE_RE +
                    '|[' + OTHER_CHARS.split('').map(escapeRE).join('') + '])' +
            '(' + Object.keys(state.env.abbreviations).map(function (x) {
      return x.substr(1)
    }).sort(function (a, b) {
      return b.length - a.length
    }).map(escapeRE).join('|') + ')' +
            '($|' + UNICODE_PUNCT_RE + '|' + UNICODE_SPACE_RE +
                    '|[' + OTHER_CHARS.split('').map(escapeRE).join('') + '])'

    const reg = new RegExp(regText, 'g')

    for (let j = 0, l = blockTokens.length; j < l; j++) {
      if (blockTokens[j].type !== 'inline') { continue }
      let tokens = blockTokens[j].children

      // We scan from the end, to keep position when new tags added.
      for (let i = tokens.length - 1; i >= 0; i--) {
        const currentToken = tokens[i]
        if (currentToken.type !== 'text') { continue }

        let pos = 0
        const text = currentToken.content
        reg.lastIndex = 0
        const nodes = []

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
          const translation = state.env.abbreviations[":" + m[2]];

          const wrapper_o = new state.Token('span_open', 'span', 1);
          wrapper_o.attrs =[ ['class', configuration.className], ];
          nodes.push(wrapper_o);
          
            const token_o = new state.Token('link_open', 'a', 1)
            token_o.attrs = [
                ['data-translation', translation ],
                ['onclick',`${configuration.childRevealFunction}("${randomId}")`],
                ['onhover',configuration.childRevealFunction],
                ['data-dialog-id',randomId],
            ];
            nodes.push(token_o);

              const token_t = new state.Token('text', '', 0)
              token_t.content = m[2]
              nodes.push(token_t)
    
            const token_c = new state.Token('link_close', 'a', -1)
            nodes.push(token_c)

            const token_do = new state.Token('dialog_open','dialog',1)
            token_do.attrs = [
              ['id',randomId],
              ['onclick',`${configuration.childCloseFunction}("${randomId}")`]
            ];
            nodes.push(token_do);

              const token_h1o = new state.Token('h1_open','h1',1);
              nodes.push(token_h1o);
                const token_t2 = new state.Token('text', '', 0);
                token_t2.content = 'Spanish Translation';
                nodes.push(token_t2);
              const token_h1c = new state.Token('h1_close','h1',-1);
              nodes.push(token_h1c)

              const token_dfno = new state.Token('dfn_open','dfn',1);
              nodes.push(token_dfno);
                const token_t5 = new state.Token('text', '', 0);
                token_t5.content = m[2];
                nodes.push(token_t5);
              const token_dfnc = new state.Token('dfn_close','dfn',-1);
              nodes.push(token_dfnc)


              const token_t3 = new state.Token('text', '', 0);
              token_t3.content = translation;
              nodes.push(token_t3);
          
            const token_dc = new state.Token('dialog_close','dialog',-1);
            nodes.push(token_dc);
          
          const wrapper_c = new state.Token('span_close','span',-1);
          nodes.push(wrapper_c);

          reg.lastIndex -= m[3].length
          pos = reg.lastIndex
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

  md.block.ruler.before('reference', 'abbr_def', abbr_def, { alt: ['paragraph', 'reference'] })

  md.core.ruler.after('linkify', 'abbr_replace', abbr_replace)
};

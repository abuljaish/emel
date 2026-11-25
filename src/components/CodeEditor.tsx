import { useEffect, useRef } from 'react'
import { basicSetup, EditorView } from 'codemirror'
import type { Range } from '@codemirror/state'
import { python } from '@codemirror/lang-python'
import { syntaxTree } from '@codemirror/language'
import { oneDark } from '@codemirror/theme-one-dark'
import { Decoration, ViewPlugin, type DecorationSet } from '@codemirror/view'

const pythonBuiltins = new Set([
  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'breakpoint', 'bytearray',
  'bytes', 'callable', 'chr', 'classmethod', 'compile', 'complex', 'delattr',
  'dict', 'dir', 'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float',
  'format', 'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help',
  'hex', 'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
  'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
  'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr',
  'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
  'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip', '__import__',
])

const highlightPythonBuiltins = ViewPlugin.fromClass(class {
  decorations: DecorationSet

  constructor(view: EditorView) {
    this.decorations = this.build(view)
  }

  update(update: { view: EditorView; docChanged: boolean }) {
    if (update.docChanged) this.decorations = this.build(update.view)
  }

  build(view: EditorView) {
    const marks: Range<Decoration>[] = []
    syntaxTree(view.state).iterate({
      enter: node => {
        if (node.type.name !== 'VariableName') return
        const name = view.state.doc.sliceString(node.from, node.to)
        if (pythonBuiltins.has(name)) marks.push(Decoration.mark({ class: 'cm-python-builtin' }).range(node.from, node.to))
      },
    })
    return Decoration.set(marks)
  }
}, { decorations: plugin => plugin.decorations })

type Props = { value: string; onChange: (text: string) => void }

export default function CodeEditor({ value, onChange }: Props) {
  const hostRef = useRef<HTMLDivElement>(null)
  const viewRef = useRef<EditorView | null>(null)
  const onChangeRef = useRef(onChange)

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!hostRef.current) return
    const view = new EditorView({
      doc: '',
      extensions: [
        basicSetup,
        python(),
        oneDark,
        highlightPythonBuiltins,
        EditorView.lineWrapping,
        EditorView.contentAttributes.of({ 'aria-label': 'Python code editor' }),
        EditorView.theme({
          '&': { height: '100%', fontSize: '13px' },
          '.cm-scroller': { fontFamily: '"Cascadia Code",Consolas,"Courier New",monospace' },
          '.cm-gutters': { backgroundColor: '#1e1e1e', color: '#858585', border: 'none' },
          '.cm-activeLineGutter': { backgroundColor: '#2a2d2e' },
          '.cm-activeLine': { backgroundColor: '#ffffff0a' },
          '.cm-cursor': { borderLeftColor: '#aeafad' },
          '.cm-selectionBackground': { background: '#264f78!important' },
          '.cm-python-builtin': { color: '#dcdcaa' },
        }, { dark: true }),
        EditorView.updateListener.of(update => {
          if (update.docChanged) onChangeRef.current(update.state.doc.toString())
        }),
      ],
      parent: hostRef.current,
    })
    viewRef.current = view
    return () => {
      view.destroy()
      viewRef.current = null
    }
  }, [])

  useEffect(() => {
    const view = viewRef.current
    if (!view || view.state.doc.toString() === value) return
    view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: value } })
  }, [value])

  return <div className="code-editor"><div className="code-mirror-host" ref={hostRef}/></div>
}

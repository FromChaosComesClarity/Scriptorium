<script>
  import { onMount, onDestroy } from 'svelte'
  import { Editor } from '@tiptap/core'
  import Placeholder from '@tiptap/extension-placeholder'
  import { markdownExtensions } from '../../../shared/schema.mjs'
  import { Find } from '../editor-extensions.js'

  export let onReady = () => {}
  export let onChange = () => {}
  export let onSelect = () => {}
  export let editable = true

  let element
  let editor

  onMount(() => {
    editor = new Editor({
      element,
      // The Markdown-safe set, exactly as the round-trip test proves it. Find is
      // added here rather than in the shared schema because it decorates without
      // touching the document, so it has nothing to do with serialisation.
      extensions: [
        ...markdownExtensions,
        Placeholder.configure({ placeholder: 'Start writing…' }),
        Find
      ],
      content: '',
      editable,
      autofocus: false,
      onUpdate: ({ transaction }) => { if (transaction.docChanged) onChange() },
      onSelectionUpdate: () => onSelect()
    })
    onReady(editor)
  })

  $: if (editor) editor.setEditable(editable)

  onDestroy(() => editor && editor.destroy())
</script>

<div class="editor-page" bind:this={element}></div>

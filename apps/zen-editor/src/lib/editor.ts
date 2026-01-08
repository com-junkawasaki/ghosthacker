import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema } from 'prosemirror-schema-basic';
import { baseKeymap } from 'prosemirror-commands';
import { keymap } from 'prosemirror-keymap';
import { history, undo, redo } from 'prosemirror-history';

export function createEditor(element: HTMLElement) {
  const state = EditorState.create({
    schema,
    plugins: [
      history(),
      keymap({ ...baseKeymap, 'Mod-z': undo, 'Mod-y': redo }),
    ]
  });

  const view = new EditorView(element, {
    state,
    dispatchTransaction(transaction) {
      const newState = view.state.apply(transaction);
      view.updateState(newState);
    }
  });

  return view;
}


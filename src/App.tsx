import { EditorProvider } from "./editor/context";
import { UiProvider } from "./app/ui-context";
import { Workspace } from "./app/Workspace";

export default function App() {
  return (
    <EditorProvider>
      <UiProvider>
        <Workspace />
      </UiProvider>
    </EditorProvider>
  );
}

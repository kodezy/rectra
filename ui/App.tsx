import { EditorProvider } from "./editor/context";
import { UiProvider } from "./shell/ui-context";
import { Workspace } from "./shell/Workspace";

export default function App() {
  return (
    <EditorProvider>
      <UiProvider>
        <Workspace />
      </UiProvider>
    </EditorProvider>
  );
}

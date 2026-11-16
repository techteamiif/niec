import { useEffect, useRef } from "react";
import { Bold, Heading2, Italic, List, ListOrdered, Underline } from "lucide-react";
import { Label } from "@/components/ui/label";

export function RichTextEditor({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const editor = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (editor.current && editor.current.innerHTML !== value) {
      editor.current.innerHTML = value;
    }
  }, [value]);

  const updateValue = () => onChange(editor.current?.innerHTML ?? "");

  return (
    <>
      <Label id={`${id}-label`}>{label}</Label>
      <div className="overflow-hidden rounded-md border bg-background">
        <div
          role="toolbar"
          aria-label="Description formatting"
          className="flex flex-wrap gap-1 border-b p-2"
        >
          {[
            { command: "bold", label: "Bold", icon: Bold },
            { command: "italic", label: "Italic", icon: Italic },
            { command: "underline", label: "Underline", icon: Underline },
            { command: "formatBlock", value: "h2", label: "Heading", icon: Heading2 },
            { command: "insertUnorderedList", label: "Bulleted list", icon: List },
            { command: "insertOrderedList", label: "Numbered list", icon: ListOrdered },
          ].map(({ command, value: commandValue, label: buttonLabel, icon: Icon }) => (
            <button
              key={command}
              type="button"
              aria-label={buttonLabel}
              title={buttonLabel}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                editor.current?.focus();
                document.execCommand(command, false, commandValue);
                updateValue();
              }}
              className="grid h-8 w-8 place-items-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
            </button>
          ))}
        </div>
        <div
          ref={editor}
          id={id}
          role="textbox"
          aria-labelledby={`${id}-label`}
          aria-multiline="true"
          contentEditable
          suppressContentEditableWarning
          onInput={updateValue}
          onPaste={(event) => {
            event.preventDefault();
            document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
          }}
          className="min-h-32 px-3 py-2 text-sm focus:outline-none [&_h2]:my-2 [&_h2]:text-lg [&_li]:ml-5 [&_ol]:list-decimal [&_p]:my-1 [&_ul]:list-disc"
        />
      </div>
    </>
  );
}

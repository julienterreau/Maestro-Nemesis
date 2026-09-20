"use client";

import { ArrowUpIcon, PaperclipIcon, SquareIcon } from "lucide-react";
import * as React from "react";
import { AttachmentCard, AttachmentCardRow } from "@/components/AttachmentCard";
import { ModelPicker } from "@/components/ModelPicker";
import { MultiModelSettings } from "@/components/MultiModelSettings";
import type { RouterPlugins } from "@/lib/openrouter-plugins";
import {
  FEATURED_MODELS,
  MEDIA_MODEL,
  collectMediaKinds,
  guessMediaType,
  modelSupportsMedia,
  type CatalogModel,
} from "@/lib/models";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

type PromptFormProps = {
  model: string;
  onModelChange: (model: string) => void;
  isBusy: boolean;
  disabled?: boolean;
  onSubmit: (text: string, files: File[]) => void;
  onStop: () => void;
  models?: CatalogModel[];
  plugins: RouterPlugins;
  onPluginChange: (key: keyof RouterPlugins, value: boolean) => void;
};

function useObjectUrls(files: File[]) {
  const [urls, setUrls] = React.useState<string[]>([]);

  React.useEffect(() => {
    const next = files.map((file) => URL.createObjectURL(file));
    setUrls(next);
    return () => {
      next.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [files]);

  return urls;
}

export function PromptForm({
  model,
  onModelChange,
  isBusy,
  disabled,
  onSubmit,
  onStop,
  models = FEATURED_MODELS,
  plugins,
  onPluginChange,
}: PromptFormProps) {
  const [input, setInput] = React.useState("");
  const [files, setFiles] = React.useState<File[]>([]);
  const [dragOver, setDragOver] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const previewUrls = useObjectUrls(files);

  function addFiles(list: FileList | File[]) {
    const next = Array.from(list);
    setFiles((currentFiles) => [...currentFiles, ...next]);
    const kinds = collectMediaKinds([
      {
        parts: next.map((file) => ({
          type: "file",
          mediaType: guessMediaType(file.name, file.type),
        })),
      },
    ]);
    if (kinds.some((kind) => !modelSupportsMedia(model, kind, models))) {
      onModelChange(MEDIA_MODEL);
    }
  }

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if ((!text && files.length === 0) || isBusy || disabled) return;
    onSubmit(text, files);
    setInput("");
    setFiles([]);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="w-full"
      onDragOver={(event) => {
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setDragOver(false);
        if (event.dataTransfer.files.length) addFiles(event.dataTransfer.files);
      }}
    >
      <InputGroup
        className={`h-auto min-h-16 items-start rounded-3xl border-border bg-card ${
          dragOver ? "border-primary" : ""
        }`}
      >
        {files.length > 0 ? (
          <div className="w-full px-3 pt-3">
            <AttachmentCardRow>
              {files.map((file, index) => (
                <AttachmentCard
                  key={`${file.name}-${index}`}
                  src={previewUrls[index] ?? ""}
                  name={file.name}
                  mediaType={guessMediaType(file.name, file.type)}
                  onRemove={() =>
                    setFiles((currentFiles) =>
                      currentFiles.filter((_, item) => item !== index),
                    )
                  }
                />
              ))}
            </AttachmentCardRow>
          </div>
        ) : null}
        <InputGroupTextarea
          value={input}
          disabled={disabled}
          rows={1}
          placeholder="Écrire un message…"
          className="min-h-12 items-start px-4 py-3 text-base md:text-sm"
          onChange={(event) => setInput(event.target.value)}
          onPaste={(event) => {
            const pasted = Array.from(event.clipboardData.files);
            if (pasted.length) addFiles(pasted);
          }}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              handleSubmit();
            }
          }}
        />
        <InputGroupAddon align="block-end" className="items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*,audio/*,video/*,.pdf,.txt,.json,.zip"
              className="hidden"
              onChange={(event) => {
                if (event.target.files) addFiles(event.target.files);
                event.target.value = "";
              }}
            />
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="ghost"
              disabled={disabled}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Ajouter un fichier"
            >
              <PaperclipIcon />
            </InputGroupButton>
            <ModelPicker
              model={model}
              models={models}
              disabled={disabled || isBusy}
              onChange={onModelChange}
            />
            <MultiModelSettings
              plugins={plugins}
              disabled={disabled || isBusy}
              onChange={onPluginChange}
            />
          </div>
          {isBusy ? (
            <InputGroupButton
              type="button"
              size="icon-sm"
              variant="secondary"
              onClick={onStop}
              aria-label="Arrêter"
            >
              <SquareIcon />
            </InputGroupButton>
          ) : (
            <InputGroupButton
              type="submit"
              size="icon-sm"
              variant="default"
              disabled={disabled || (!input.trim() && files.length === 0)}
              aria-label="Envoyer"
            >
              <ArrowUpIcon />
            </InputGroupButton>
          )}
        </InputGroupAddon>
      </InputGroup>
    </form>
  );
}

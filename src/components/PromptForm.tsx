"use client";

import * as React from "react";
import { ArrowUpIcon, SquareIcon } from "lucide-react";
import { MODELS } from "@/lib/models";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupTextarea,
} from "@/components/ui/input-group";

export function PromptForm({
  model,
  onModelChange,
  isBusy,
  disabled,
  onSubmit,
  onStop,
}: {
  model: string;
  onModelChange: (model: string) => void;
  isBusy: boolean;
  disabled?: boolean;
  onSubmit: (text: string) => void;
  onStop: () => void;
}) {
  const [input, setInput] = React.useState("");

  function handleSubmit(event?: React.FormEvent) {
    event?.preventDefault();
    const text = input.trim();
    if (!text || isBusy || disabled) return;
    onSubmit(text);
    setInput("");
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <InputGroup className="h-auto min-h-16 rounded-3xl border-border bg-card">
        <InputGroupTextarea
          value={input}
          disabled={disabled}
          rows={1}
          placeholder="Écrire un message…"
          onChange={(event) => setInput(event.target.value)}
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
        <InputGroupAddon align="block-end" className="justify-between">
          <select
            value={model}
            disabled={disabled || isBusy}
            onChange={(event) => onModelChange(event.target.value)}
            className="max-w-[220px] truncate bg-transparent text-xs text-muted-foreground outline-none"
          >
            {MODELS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.provider} · {item.label}
              </option>
            ))}
          </select>
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
              disabled={disabled || !input.trim()}
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

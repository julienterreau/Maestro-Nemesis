import { Button } from "@/components/ui/button";
import type { Conversation } from "@/lib/types";

type SidebarProps = {
  conversations: Conversation[];
  activeId: string;
  open: boolean;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
};

function formatTime(timestamp: number) {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
}

export function Sidebar({
  conversations,
  activeId,
  open,
  onClose,
  onSelect,
  onCreate,
  onDelete,
}: SidebarProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-20 bg-black/50 md:hidden ${open ? "block" : "hidden"}`}
        onClick={onClose}
      />
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-70 flex-col border-r bg-sidebar p-4 transition-transform md:static md:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
              Julien Terreau
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Powerfull Rokia AI</h1>
          </div>
          <Button size="sm" onClick={onCreate}>
            Nouveau
          </Button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto pr-1">
          {conversations.length === 0 ? (
            <p className="px-2 text-sm text-muted-foreground">
              Aucune conversation pour le moment.
            </p>
          ) : (
            conversations.map((conversation) => {
              const active = conversation.id === activeId;

              return (
                <div
                  key={conversation.id}
                  className={`group flex items-start gap-2 rounded-2xl border px-3 py-3 ${
                    active
                      ? "border-border bg-sidebar-accent"
                      : "border-transparent hover:border-border"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelect(conversation.id)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">
                      {conversation.title}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatTime(conversation.updatedAt)}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(conversation.id)}
                    className="rounded-lg px-2 py-1 text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                    aria-label="Supprimer la conversation"
                  >
                    ✕
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
}

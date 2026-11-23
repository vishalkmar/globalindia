"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";

import { cn } from "@/lib/utils";

function Row({ id, label, children, disabled }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } =
    useSortable({ id, disabled });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={cn(
        "flex items-center gap-2 rounded-btn bg-card shadow-[0_0_0_1px_var(--hairline),var(--sh-xs)]",
        isDragging && "relative z-10 border-primary shadow-[0_8px_24px_-12px_rgb(0_0_0/0.35)]",
      )}
    >
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        disabled={disabled}
        aria-label={`Move ${label}. Press space to pick up, arrow keys to move, space to drop.`}
        className="flex h-full cursor-grab items-center self-stretch px-2 text-muted hover:text-ink active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
      >
        <GripVertical aria-hidden="true" className="size-4" />
      </button>
      <div className="min-w-0 flex-1 py-2.5 pr-3">{children}</div>
    </li>
  );
}

/**
 * Drag-and-drop reorder (Phase 6 todo 09) — mouse, touch and keyboard (space + arrows).
 * @param {{ items: {id:string,label:string}[], onReorder: (items:any[]) => void, renderItem?: (item:any)=>any, disabled?: boolean }} props
 */
export function SortableList({ items, onReorder, renderItem, disabled = false, className }) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd({ active, over }) {
    if (!over || active.id === over.id) return;
    const from = items.findIndex((i) => i.id === active.id);
    const to = items.findIndex((i) => i.id === over.id);
    onReorder(arrayMove(items, from, to));
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={onDragEnd}
      accessibility={{
        announcements: {
          onDragStart: ({ active }) => `Picked up ${items.find((i) => i.id === active.id)?.label}.`,
          onDragOver: ({ over }) =>
            over ? `Over position ${items.findIndex((i) => i.id === over.id) + 1} of ${items.length}.` : "",
          onDragEnd: ({ over }) =>
            over ? `Dropped at position ${items.findIndex((i) => i.id === over.id) + 1}.` : "Dropped.",
          onDragCancel: () => "Move cancelled.",
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
        <ul className={cn("flex flex-col gap-2", className)}>
          {items.map((item) => (
            <Row key={item.id} id={item.id} label={item.label} disabled={disabled}>
              {renderItem ? renderItem(item) : <span className="font-medium">{item.label}</span>}
            </Row>
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

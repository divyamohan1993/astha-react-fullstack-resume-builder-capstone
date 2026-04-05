import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useResumeStore } from '@/store/resumeStore';
import type { Section } from '@/store/types';
import { SectionEditor } from './SectionEditor';

function SortableSection({ section, index }: { section: Section; index: number }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: section.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="relative">
      <div className="absolute left-0 top-0 flex items-center">
        <button
          type="button"
          className="min-h-[44px] min-w-[44px] cursor-grab rounded-md text-lg active:cursor-grabbing"
          style={{ color: 'var(--text-muted)' }}
          aria-label={`Drag to reorder ${section.heading}. Currently at position ${index + 1}`}
          {...attributes}
          {...listeners}
          aria-roledescription="sortable"
        >
          &#x2630;
        </button>
      </div>
      <div className="pl-10">
        <SectionEditor section={section} />
      </div>
    </div>
  );
}

export function DraggableSections() {
  const sections = useResumeStore((s) => s.resume.sections);
  const reorderSections = useResumeStore((s) => s.reorderSections);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = sections.findIndex((s) => s.id === active.id);
    const to = sections.findIndex((s) => s.id === over.id);
    if (from !== -1 && to !== -1) {
      reorderSections(from, to);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={sections.map((s) => s.id)} strategy={verticalListSortingStrategy}>
        <div className="space-y-8" role="list" aria-label="Resume sections">
          {sections.map((section, i) => (
            <div key={section.id} role="listitem">
              <SortableSection section={section} index={i} />
            </div>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

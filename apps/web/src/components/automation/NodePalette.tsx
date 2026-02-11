import { Zap, Clock, Mail } from 'lucide-react';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeType: string) => void;
}

export default function NodePalette({ onDragStart }: NodePaletteProps) {
  return (
    <div className="w-64 border-r bg-gray-50 p-4">
      <h3 className="mb-4 font-semibold text-gray-700">Dostupné uzly</h3>
      <div className="space-y-2">
        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'trigger')}
          className="flex cursor-move items-center gap-3 rounded-md border-2 border-blue-500 bg-white p-3 shadow transition-shadow hover:shadow-md"
        >
          <Zap className="h-5 w-5 text-blue-500" />
          <div>
            <div className="font-medium text-blue-900">Trigger</div>
            <div className="text-xs text-gray-600">Spouštěč pravidla</div>
          </div>
        </div>

        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'delay')}
          className="flex cursor-move items-center gap-3 rounded-md border-2 border-amber-500 bg-white p-3 shadow transition-shadow hover:shadow-md"
        >
          <Clock className="h-5 w-5 text-amber-500" />
          <div>
            <div className="font-medium text-amber-900">Zpoždění</div>
            <div className="text-xs text-gray-600">Časové zpoždění</div>
          </div>
        </div>

        <div
          draggable
          onDragStart={(e) => onDragStart(e, 'action')}
          className="flex cursor-move items-center gap-3 rounded-md border-2 border-green-500 bg-white p-3 shadow transition-shadow hover:shadow-md"
        >
          <Mail className="h-5 w-5 text-green-500" />
          <div>
            <div className="font-medium text-green-900">Akce</div>
            <div className="text-xs text-gray-600">Provedení akce</div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-md bg-blue-50 p-3 text-sm text-gray-700">
        <p className="mb-2 font-medium">Jak na to:</p>
        <ol className="list-inside list-decimal space-y-1 text-xs">
          <li>Přetáhněte uzly na plátno</li>
          <li>Propojte je táhnutím z výstupů</li>
          <li>Nastavte parametry v uzlech</li>
          <li>Uložte pravidlo</li>
        </ol>
      </div>
    </div>
  );
}

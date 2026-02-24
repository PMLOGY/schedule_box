export function LiveWidgetPreview() {
  return (
    <div className="rounded-xl border bg-white shadow-2xl overflow-hidden">
      {/* Browser chrome mock */}
      <div className="flex items-center gap-1.5 border-b bg-gray-100 px-3 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-yellow-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-green-400" />
        <div className="ml-2 flex-1 rounded bg-gray-200 px-2 py-0.5 text-xs text-gray-400">
          schedulebox.cz/embed/salon-krasa
        </div>
      </div>

      {/* Live widget iframe */}
      <iframe
        src="/embed/salon-krasa?locale=cs&theme=light"
        title="Ukázka rezervačního widgetu"
        className="h-[480px] w-full"
        loading="lazy"
      />
    </div>
  );
}

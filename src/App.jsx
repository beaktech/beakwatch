export default function App() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-1 overflow-hidden">
        <main className="w-[70%] h-full">Hero</main>
        <aside className="w-[30%] h-full border-l border-forest-700">Sidebar</aside>
      </div>
      <footer className="h-10 border-t border-forest-700 flex items-center px-4 text-sm text-white/70">
        Stats bar
      </footer>
    </div>
  )
}

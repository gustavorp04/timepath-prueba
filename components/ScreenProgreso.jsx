"use client";

export default function ScreenProgreso({ racha, rachaBump }) {
  // 5 días -> 75%, 6 días -> 85% (igual que el prototipo original)
  const dash = Math.max(0, Math.min(100, 25 + racha * 10));

  return (
    <section className="absolute inset-0 overflow-y-auto no-scrollbar p-6 pb-32 bg-slate-50 screen-enter">
      <header className="mb-6 mt-6 text-center">
        <h1 className="text-2xl font-bold text-slate-800">Tu Progreso</h1>
      </header>

      <div className="bg-white rounded-[2rem] p-8 shadow-sm border border-slate-100 mb-6 flex flex-col items-center justify-center">
        <div
          className={`relative w-32 h-32 mb-6 transition-transform duration-500 ${
            rachaBump ? "scale-110" : ""
          }`}
        >
          <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-slate-100"
              strokeWidth="3"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              className="text-orange-500 transition-all duration-1000 ease-out"
              strokeDasharray={`${dash}, 100`}
              strokeWidth="3"
              strokeLinecap="round"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-4xl font-black text-slate-800 tracking-tighter transition-all">
              {racha}
            </span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              Días
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xl">🔥</span>
          <h2 className="text-lg font-bold text-slate-800">Sin Amanecidas</h2>
        </div>
        <p className="text-xs text-slate-500 mt-2 text-center">
          ¡Sigue así, estás cuidando tu salud mental!
        </p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
        <div className="flex justify-between items-end mb-3">
          <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
            Semana libre de sobrecarga
          </span>
          <span className="text-sm font-black text-blue-500">80%</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 rounded-full w-[80%] transition-all duration-1000"></div>
        </div>
      </div>
    </section>
  );
}

import { LoginButton } from '@/components/LoginButton'

export default function LandingPage() {
  return (
    <main className="flex-1 flex flex-col items-center justify-center relative px-6">
      {/* Ambient background glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gold/5 blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-lg text-center space-y-8">
        {/* Arabic calligraphy header */}
        <div className="space-y-2">
          <p className="arabic text-gold text-4xl leading-relaxed">سَيْر</p>
          <h1 className="text-5xl font-light tracking-tight text-text-primary">
            Sayr
          </h1>
        </div>

        <div className="ornament-divider text-sm">بسم الله الرحمن الرحيم</div>

        <p className="text-text-secondary text-lg leading-relaxed max-w-md">
          Walk your day with purpose. A structured work session guided by
          Imam Al-Ghazali&apos;s six-step framework for mastering your time
          and your nafs.
        </p>

        {/* The six steps preview */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm text-sm">
          {[
            { ar: 'المشارطة', en: 'Musharata', desc: 'Set conditions' },
            { ar: 'المراقبة', en: 'Muraqaba', desc: 'Watch & work' },
            { ar: 'المحاسبة', en: 'Muhasaba', desc: 'Self-account' },
            { ar: 'المعاقبة', en: "Mu'aqaba", desc: 'Course correct' },
            { ar: 'المجاهدة', en: 'Mujahada', desc: 'Strive' },
            { ar: 'المعاتبة', en: "Mu'ataba", desc: 'Gentle review' },
          ].map((step, i) => (
            <div
              key={i}
              className="glass-card p-3 text-center space-y-1"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <p className="arabic text-gold text-xs">{step.ar}</p>
              <p className="text-text-primary font-medium text-xs">{step.en}</p>
              <p className="text-text-muted text-[10px]">{step.desc}</p>
            </div>
          ))}
        </div>

        <LoginButton />

        <p className="text-text-muted text-xs">
          Begin with Bismillah. End with Shukr.
        </p>
      </div>
    </main>
  )
}

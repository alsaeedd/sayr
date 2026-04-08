import { NextResponse } from 'next/server'

// Aladhan API calculation methods
// See: https://aladhan.com/prayer-times-api#GetTimings
const CALCULATION_METHODS: Record<string, { id: number; name: string; region: string }> = {
  JAFARI:       { id: 0,  name: 'Shia Ithna-Ashari, Leva Institute, Qum', region: 'Iran / Shia' },
  KARACHI:      { id: 1,  name: 'University of Islamic Sciences, Karachi', region: 'Pakistan / South Asia' },
  ISNA:         { id: 2,  name: 'Islamic Society of North America', region: 'North America' },
  MWL:          { id: 3,  name: 'Muslim World League', region: 'Europe / Global' },
  MAKKAH:       { id: 4,  name: 'Umm Al-Qura University, Makkah', region: 'Saudi Arabia' },
  EGYPT:        { id: 5,  name: 'Egyptian General Authority of Survey', region: 'Egypt / Africa' },
  TEHRAN:       { id: 7,  name: 'Institute of Geophysics, University of Tehran', region: 'Iran' },
  GULF:         { id: 8,  name: 'Gulf Region', region: 'Bahrain / UAE / Qatar / Oman' },
  KUWAIT:       { id: 9,  name: 'Kuwait', region: 'Kuwait' },
  QATAR:        { id: 10, name: 'Qatar', region: 'Qatar' },
  SINGAPORE:    { id: 11, name: 'Majlis Ugama Islam Singapura', region: 'Singapore' },
  TURKEY:       { id: 13, name: 'Diyanet İşleri Başkanlığı', region: 'Turkey' },
  DUBAI:        { id: 16, name: 'Dubai', region: 'Dubai / UAE' },
  MOROCCO:      { id: 21, name: 'Morocco', region: 'Morocco' },
  JORDAN:       { id: 23, name: 'Ministry of Awqaf, Jordan', region: 'Jordan' },
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat') || '26.2235'  // Bahrain default
  const lng = searchParams.get('lng') || '50.5876'
  const method = searchParams.get('method') || '8'   // Gulf Region default
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const [year, month, day] = date.split('-')

  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=${method}`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      throw new Error('Prayer times API error')
    }

    const data = await res.json()
    const timings = data.data.timings
    const meta = data.data.meta

    return NextResponse.json({
      timings: {
        Fajr: timings.Fajr,
        Dhuhr: timings.Dhuhr,
        Asr: timings.Asr,
        Maghrib: timings.Maghrib,
        Isha: timings.Isha,
      },
      method: {
        id: meta.method.id,
        name: meta.method.name,
      },
    })
  } catch {
    return NextResponse.json({
      timings: {
        Fajr: '04:30',
        Dhuhr: '11:45',
        Asr: '15:15',
        Maghrib: '17:55',
        Isha: '19:15',
      },
      method: { id: 8, name: 'Gulf Region (fallback)' },
    })
  }
}

// Endpoint to list all methods
export async function POST() {
  return NextResponse.json({ methods: CALCULATION_METHODS })
}

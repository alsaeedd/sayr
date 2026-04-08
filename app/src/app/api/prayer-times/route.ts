import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat') || '21.4225'  // Mecca default
  const lng = searchParams.get('lng') || '39.8262'
  const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
  const [year, month, day] = date.split('-')

  try {
    const res = await fetch(
      `https://api.aladhan.com/v1/timings/${day}-${month}-${year}?latitude=${lat}&longitude=${lng}&method=2`,
      { next: { revalidate: 3600 } }
    )

    if (!res.ok) {
      throw new Error('Prayer times API error')
    }

    const data = await res.json()
    const timings = data.data.timings

    return NextResponse.json({
      Fajr: timings.Fajr,
      Dhuhr: timings.Dhuhr,
      Asr: timings.Asr,
      Maghrib: timings.Maghrib,
      Isha: timings.Isha,
    })
  } catch {
    // Fallback prayer times
    return NextResponse.json({
      Fajr: '05:00',
      Dhuhr: '12:00',
      Asr: '15:30',
      Maghrib: '18:30',
      Isha: '20:00',
    })
  }
}

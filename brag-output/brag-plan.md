# /brag plan — TrackTots

**What it is:** A React Native (Expo) app for parents that marks a child's class attendance automatically when they arrive at class, using background location and a geofence around each class.
**Who it's for:** Parents juggling kids' activities (music, sports, academics, arts) who want an effortless record of attendance and pickup reminders.
**What sets it apart:** Zero-tap attendance: pin the class once, and a background task checks location, matches the geofence and the check-in window, marks "present" and notifies you.
**Most impressive true claim:** "Class started. Attendance: done. Nobody tapped a thing."
**Visual hook:** A lock-screen notification: "Attendance Marked ✓ — Aarav is now marked present for Piano Lessons" (the app's real notification text).
**Tone:** friendly, clean product launch; blue → violet brand gradient.
**Share caption:** "Never miss a class."

## What's real
- **Copy and behaviour from the code:** notification texts ("Attendance Marked ✓ …", "Pickup Reminder 🏫 — Time to pick up from …!") from `src/services/NotificationService.ts`; background checks every 60 s / 50 m, Haversine distance, ±15-minute check-in window and `detectionMethod: 'geofence'` from `src/services/LocationService.ts`; 100 m default geofence radius (50–5000 m) and 15-minute pickup-reminder default from `src/screens/classes/AddClassScreen.tsx`
- **Screens rebuilt from the components:** Home ("Welcome back!", "Track Your Kids' Classes", Attendance Overview stats, Today's Schedule, Quick Actions), Add Class (categories Music/Sports/Academic/Arts, class colors), Pick Location map picker, Reports (This Month / Last Month / This Year, Weekly Trend, Attendance by Class, Export)
- **Theme:** `src/constants`: primary `#3B82F6`, secondary `#8B5CF6`, success `#10B981`, warning `#F59E0B`, gray scale; system font rendered as Inter
- **Illustrative:** child and class names, school name and all dashboard/report numbers are sample data (labelled "Sample data shown" in scene 5). The map is a stylised SVG: the app uses Leaflet + OpenStreetMap tiles, which were blocked in the render sandbox. The app can't run on web (native SQLite via WatermelonDB, background location), so screens are HTML rebuilds, not recordings.

## Storyboard (base 21 s → 42 s with narration)
| # | Scene | On screen |
|---|-------|-----------|
| 1 | Hook | "Class started. Attendance: done." + lock-screen "Attendance Marked ✓" notification |
| 2 | Reveal | TrackTots + "Automatic class attendance for your kids — powered by geofencing." |
| 3 | Step 1 | Add Class form → Pick on Map → pin + geofence circle → Confirm Location |
| 4 | Step 2 | Map: phone dot drives into the 100 m geofence, fence turns green, notification; background every minute / 50 m, ±15 min window |
| 5 | Step 3 | Home dashboard + pickup reminder + Reports (weekly trend, by class, Export) |
| 6 | Outro | "Never miss a class." + stack + GitHub |

## Sound
E major, 108 bpm, light and bright; notification chimes in key, key ticks under typing, taps as clicks, swell as the geofence appears, success chime on auto check-in.

## Voice-over version (42s)
The final `brag.mp4` is the extended cut with narration. Voice: Kokoro TTS (`af_heart`), generated locally. Each scene's timeline was stretched to fit its line (entrances and transitions keep their original speed; only the hold in the middle of each scene slows down), the soundtrack was re-timed to match, and the music ducks under the voice. Some spellings below are written for the voice (phonetic), not for the screen.

| # | Time | Narration |
|---|------|-----------|
| 1 | 0.0–5.3s | Four o'clock. Piano class just started, and attendance is already marked. |
| 2 | 5.3–11.3s | This is TrackTots: automatic class attendance for your kids, powered by geofencing. |
| 3 | 11.3–17.7s | Add a class once: the schedule, the instructor, and a pin on the map with a geofence around it. |
| 4 | 17.7–28.0s | Then it runs in the background. When you arrive within a hundred metres of class, during the check-in window, your child is marked present, and you get a notification. |
| 5 | 28.0–36.0s | Every class ends up on the record, with a calendar, weekly trends, pickup reminders, and reports you can export and share. |
| 6 | 36.0–41.8s | TrackTots. Never miss a class. It's open source on GitHub. |

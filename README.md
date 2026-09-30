# AeroAcoustic AI
Autonomous Enterprise Speaker Health & Bio-Acoustic Suite — agentic OPAV loop, Acoustic Digital Twin, thermal/excursion governor, TinyML-style classifier, CFD visualizer, signed Acoustic Health Index passport.

**Designed and developed by NIKHIL CHARY SRIRAMOJU** · [GitHub](https://github.com/Nikhil-creat) · [LinkedIn](https://in.linkedin.com/in/nikhil-chary-sriramoju-95041b38a)

## Deploy on GitHub Pages
1. Extract the zip. 2. Create a repo and upload **all contents** (keep `index.html` at the repo root, include `.nojekyll`).
3. Settings → Pages → Deploy from branch → `main` / root. 4. Open `https://<user>.github.io/<repo>/`.

## v2 highlights
- **Guaranteed cleaning session:** 10–60 s slider; the agent runs at least that long of active vibration/acoustic drive, and auto-extends (max 60 s) until the speaker is clear.
- Cleaning profiles (standard, water-eject, dust-lift, gentle), live waterfall spectrogram, wear forecast, session history, asset record fields, battery guard, wake lock, voice guidance, signed passport with history.

## v3
- **HYPER CLEAN:** four-band sweep from 60 Hz up to the device's usable limit (≈20 kHz; phone speakers and 48 kHz audio hardware cannot produce 60 kHz), tweeter-safe amplitude taper.
- Credentials panel, Open Graph + schema.org author metadata.

## Modes
- **Simulation** (default): full agent, Twin, safety and CFD with no audio.
- **Live**: plays audible sweeps and listens via mic (RAM only, nothing uploaded). Needs HTTPS (Pages provides it). Use low volume.

## Honest limits
Web can't read the barometer, voice-coil impedance, or true coil temperature; thermal/excursion are model estimates and the classifier weights are placeholders to replace with a trained model. Not a certified waterproofing test. Use at your own risk.

## Layout
`index.html · style.css · sw.js · manifest.webmanifest · js/ · docs/`

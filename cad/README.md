# cad/

Your models. Keep the source files in `cad/src/` (whatever the CAD tool saves) and put the exports the simulator loads in `cad/exports/`.

## sim-scene.json

Tells the simulator which exported parts to load and where the LEDs sit. With `"parts": []` the simulator shows a placeholder clock.

```json
{
  "upAxis": "z",
  "parts": [
    { "file": "exports/core.stl", "color": "#ffffff" },
    { "file": "exports/shell-unicorn.3mf", "color": "#f2c6d0" },
    { "file": "exports/diffuser.stl", "role": "diffuser", "color": "#f4f1e8", "spread": 14 }
  ],
  "leds": {
    "count": 12,
    "center": [0, -6, 55],
    "radius": 17.5,
    "right": [1, 0, 0],
    "up": [0, 0, 1],
    "front": [0, -1, 0],
    "startAngleDeg": 0,
    "clockwise": true
  }
}
```

- Units are millimetres, in the same coordinates as your CAD export. `upAxis` is `"z"` for most CAD tools.
- `file` paths are relative to `cad/`. STL and 3MF work.
- `role: "diffuser"` marks the part the LEDs shine through; it gets coloured by the LEDs. `spread` (mm) is how far each LED's light spreads on it: bigger means smoother.
- `color` overrides the part's colour (leave it out on a 3MF to keep its own colours).
- `leds` describes the ring: centre, radius, the plane it lies in (`right` and `up` as seen from the front), which way the light points (`front`), where LED 0 is (0° = top) and the direction of numbering. Or give `"positions": [[x,y,z], ...]` for any other layout. LED order must match the order in the firmware.

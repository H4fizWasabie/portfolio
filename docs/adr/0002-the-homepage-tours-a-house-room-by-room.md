# The homepage tours a House, Room by Room

The single clay room is replaced by a House: a two-storey concrete villa on a lake. The hero sees it from across the water, and the scroll glides the camera over the lake, onto the terrace and in through the sliding glass. Two Rooms sit on each floor, one per service: stock and purchasing and records downstairs, AI and automation and Android upstairs, with teaching on the upstairs balcony. Each project's condensed case study is told at its object. We chose one Room per service over one per project because seven Rooms cost too much to model and download, and because clients already read the work grouped by what they can ask for. Lighting is baked in Blender into a texture per asset rather than left to vertex ambient occlusion, which is what made the old room look like clay.

## Consequences

- The outside (exterior, lake, backdrop, stairs and balcony) comes first, under 2.5 MB with no texture over 2048 px on a side. Each Room is its own download, fetched when the visitor is one Room away, and stays under 2 MB. Size ceilings are checked at build time.
- Night needs a second bake per asset, downloaded only when the lamp is switched.
- The tour is scroll-only: dragging to orbit is gone, because a free camera fights the scroll and sees through walls.
- The full case-study pages stay; the Rooms tell a short version and link to them.

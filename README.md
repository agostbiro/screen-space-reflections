## Screen-Space Reflections with WebGL (WIP)

Screen-space reflections (SSR) are a deferred rendering method for realistic reflections. The advantage of SSR over reflection maps and planar reflections is that it can calculate reflections for dynamic changes in the scene (e.g. the reflections of an avatar or NPCs) and for all reflecting objects. The disadvantage is that SSR can only render reflections of objects visible in the frame and it is more demanding in terms of performance than reflection maps. The performance difference between SSR and planar reflections is unclear.

SSR works by taking a shaded frame in a framebuffer object with multiple buffers and then performs ray tracing for each fragment to find other fragments that might be reflected in that fragment. The output is the color contribution of the other, reflected fragments to the current fragment.

This is work in progress.

See live demo here: http://abiro.github.io/screen-space-reflections/

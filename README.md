# Report on Screen-Space Reflections
*Agost Biro, 2015-10-02*

## Intro

Screen-space reflections (SSR) are a deferred rendering method for realistic reflections. The advantage of SSR over reflection maps and planar reflections is that it can calculate reflections for dynamic changes in the scene (e.g. the reflections of an avatar or NPCs) and for all reflecting objects. The disadvantage is that SSR can only render reflections of objects visible in the frame and it is more demanding in terms of performance than reflection maps. The performance difference between SSR and planar reflections is unclear.

SSR works by taking a shaded frame in a framebuffer object with multiple buffers and then performs ray tracing for each fragment to find other fragments that might be reflected in that fragment. The output is the color contribution of the other, reflected fragments to the current fragment.

See live demo here: http://abiro.github.io/screen-space-reflections/

## Ray tracing and ray marching

Ray tracing is a sequence of recursive ray marching steps. Ray marching is a procedure where a ray is iteratively advanced through some space to determine whether that ray hits an object in that space. In the case of SSR, ray marching is performed in screen space, hence the name. Screen space is a 2D space corresponding to the image plane. I found it most practical to set units so that integers correspond to pixels and the origin is at the center (I'm assuming symmetric FOV).

While the ray is advanced in screen space, collision detection is performed in view or clip space. The problem of collision detection is reduced here to the problem of deciding whether a point lies on a line segment. This can be approximated by testing whether the depth of the ray at an iteration is behind the depth of the fragment that is at a coordinate in screen space where a point along the ray’s path would be projected to. Depth testing is performed in my implementation in clip space using the reciprocal of z-coordinates. The reciprocals of z-coordinates are used, because this way linear interpolation in screen space produces perspective-correct values.

## Hit testing

The desktop implementations I've looked at [1, 5] seem to perform only a depth test to perform collision detection. My experience found this approach lacking. Consider the case of a planar surface parallel to the image plane. Using only depth testing, a hit will be produced for the bottom of the surface for positions that should reflect the top, as ray marching will encounter fragments at the bottom first and those will satisfy the depth test as points on the surface share the same depth. To avoid such false positives, I chose to add an additional test for ray direction. The dot product of the reflected ray and the direction between the reflector and reflected fragment should be close to 1 to pass. This is a relatively cheap test to perform, but greatly increases image quality. I also test whether the candidate surface actually faces the ray to avoid some artifacts caused by reflecting the wrong side of an object.

Marching a ray pixel-by-pixel through a frame to detect reflections is not feasible for performance reasons. The solution is to take large strides across the screen space until a coarse hit is found and then recursively refine the match with a binary search-like procedure. The literature [1] proposes using depth as criteria for the refinement, but I've found it better to converge on the reflected ray's direction. The problem with using depth as criteria for refinement, in addition to the aforementioned parallel planar surface problem, is that a lot of precision is lost due to comparing reciprocal z-values.

My approach rests on the assumption that depth on the surfaces of objects does not vary much over a stride, which I think is a valid assumption for strides of, say, 16 pixels in closed environments. If there was a large depth variance over such a small area, then the object would have to be pretty far away, but in that case a reflection map is a better choice than screen-space reflections anyway. The drawback is that the method breaks if the stride happens to cover two or more objects with large depth differences.

## Realistic reflections

Apart from ray tracing, an other issue to consider with SSR is the question of reflectance, refraction and attenuation. A robust implementation must take into account the material of surfaces to render more realistic reflections. By opting for glossy surfaces, this can also help with masking artifacts.

## Edge cases

There are numerous edge cases where SSR breaks that all implementations must carefully consider. Most of these arise from the discrete nature of SSR, meaning that SSR can only work with surfaces visible in the frame.

Surfaces may not be visible in a frame, because they are occluded by other objects, they are facing away from the camera, or because they are simply outside the frame. These issues are encountered in particular when objects reflect rays towards the camera. Supporting rays reflected towards the camera also needs adjustments to depth testing, as the ray will travel to opposite direction.

The bottom part of convex objects that lie on the ground pose a challenge, because the ray march is liable to step over their small area of possible hits without producing a coarse hit. A different challenge is that the bottom part will be occluded in the frame, yet its reflection should be visible on the floor.

## Demo

The [demo](http://abiro.github.io/screen-space-reflections/) targets Chrome browsers and the scene consists of a specular, textured, tiled floor, a highly specular Utah teapot and 3 diffusely shaded Stanford bunnies. Other than ambient lightning, there is a single directional light source in the scene. Shadows are not implemented. 

The current state of the demo (2015-10-02) implements SSR with only 1 ray tracing step and performs ray marching with 16 pixels strides refined by a 4 step binary search at the end. To produce a coarse hit, the ray's depth must be higher than the candidate fragments, the direction between the candidate's view position and the original position must closely match the reflected ray's direction and the surface of the candidate fragment must face the ray. The binary search-like refinement procedure converges on the direction of the candidate ray and the reflected ray.

All reflecting surfaces are considered to be perfect mirrors in the demo and the reflected colors are simply divided by the magnitude of the reflected ray. (Following the inverse square law, one should divide by the square of the distance, but I wanted to emphasize reflections a little more.) A robust implementation should account for the material of the reflected objects.

Staircase artifacts are present in the demo. I've tried to eliminate these by implementing jittering, but it only resulted in minimal improvements, so I discarded it. As it would be advisable to implement SSR at a lower resolution than the window's for performance, the staircase artifacts could be smoothed over during upsampling.

Different artifacts are present in the demo due to missing information in the frame. This is apparent in the objects' reflections in the floor where a slice is missing near the bottom at some angles. This is due to the bottom of the objects being occluded by their higher parts. Another case is the incomplete reflections of the bunnies in the teapot, where the parts that should be reflected are either outside the frame, face a different direction or the rays toward them are killed on account of moving towards the camera.

Artifacts at the bottom half of the teapot are present due to the ray march stepping over the small area of possible hits without producing a coarse hit. If the stride is set to 1 these artifacts completely disappear, but that is not feasible for performance. I've experimented with progressively increasing the stride in the beginning, but that didn't work either, as the area to cover is too large. In the end, I managed to greatly reduce the severity of this artifact by increasing the tolerance of direction matching for down-facing surfaces to allow for coarse matches that can then be refined by binary search. The assumption here is that down-facing surfaces are close to the ground and a higher variance in angles is tolerable for short distances.

Finally, the current implementation of SSR assumes a square frame for simplicity. To work with other aspect ratios, a rasterization algorithm such as DDA must be employed.

## Future work

### Short term
- See if upsampling or a blur gets rid of the staircase artifacts
- Allow changing stride and max iterations in the widget
- Proper testing framework for the ray tracing procedure
- An easy-to-use JS-module to allow for testing on scenes other than the demo

### Long term
- Fine-tune performance
- Account for material in reflection
- DDA to make sure every pixel is visited
- Antialiasing
- Use advanced data structure to speed up ray marching (see [2-4])
- Reprojections from other viewpoints to provide off-screen reflections

## Conclusion

The project in its current form shows the potential of screen-space reflections and provides a solid foundation for developing a robust, production-ready implementation.

## Sources
1. McGuire, Morgan and Michael Mara. "Efficient GPU Screen-Space Ray Tracing." Journal of Computer Graphics Techniques (JCGT). Vol. 3. No. 4. 2014.
1. Uludag, Yasin. "Hi-Z Screen-Space Cone-Traced Reflections." GPU Pro 5: Advanced Rendering Techniques (2014): 149.
1. Widmer, S., et al. "An adaptive acceleration structure for screen-space ray tracing." Proceedings of the 7th Conference on High-Performance Graphics. ACM, 2015.
1. Yu, Xuan, Rui Wang, and Jingyi Yu. "Interactive Glossy Reflections using GPU‐based Ray Tracing with Adaptive LOD." Computer Graphics Forum. Vol. 27. No. 7. Blackwell Publishing Ltd, 2008.
1. "Screen Space Reflections in Unity 5." kode80. kode80, 11 March 2015. Web. 2 October 2015.

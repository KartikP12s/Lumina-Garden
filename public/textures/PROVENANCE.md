# Offline AI asset

`garden-soil.png` was generated with the built-in OpenAI image generation tool
on October 12, 2026 for this implementation. It is included in the repository
and loaded as the ground's sRGB albedo texture. It is not a replacement for
the procedural plant geometry. No runtime AI service or API key is used.

Final prompt:

> Use case: stylized-concept. Asset type: square seamless ground albedo texture for a real-time WebGL bioluminescent garden, directly top-down with no perspective. Dark organic forest soil with muted moss, tiny irregular slate stones and fine roots. Charcoal blue and muted desaturated teal palette, subtle organic texture, no glowing dots, no large rocks, no plants, no flowers, no horizon, no vignette, no text or watermark. Uniform diffuse illumination without directional shadows. Tileable edge-to-edge texture to repeat on a ground plane under luminous procedural plants. Square image.

The provided Assignment 2 references Stable Diffusion / Midjourney mockups.
Those original mockup textures were not supplied. This build uses a newly
generated ground texture instead, and a procedural background rather than
an AI skybox. No claim is made that Stable Diffusion or Midjourney was used
for this implementation. Seamlessness was requested but is not guaranteed;
the material is repeated on a small circular ground surface.

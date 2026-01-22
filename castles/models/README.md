# Castles 3D Tile Models

## Supported Formats

The game now uses Three.js for 3D rendering and supports the following 3D model formats:

### GLTF/GLB (Recommended)
- **Format**: `.gltf` or `.glb`
- **Why**: Industry standard, widely supported, optimized for web
- **Features**: Animations, materials, textures, PBR

### OBJ
- **Format**: `.obj` (with `.mtl` for materials)
- **Why**: Simple, widely supported
- **Features**: Basic geometry and materials

### FBX
- **Format**: `.fbx`
- **Why**: Popular in game development
- **Features**: Complex models with animations

## How to Add 3D Models

1. **Export your 3D tile models** in GLB format (preferred)
2. **Place files** in the `/castles/models/` directory
3. **Name convention**: Use terrain type prefixes:
   - `grass_*.glb` - Grass terrain tiles
   - `road_*.glb` - Road terrain tiles
   - `city_*.glb` - City terrain tiles
   - `castle_*.glb` - Castle terrain tiles

## Current Implementation

The game currently uses **procedurally generated 3D tiles** with Three.js geometry:
- Base platform (BoxGeometry)
- Raised edge indicators (color-coded by terrain type)
- Center sphere indicator
- Phong material with lighting

## Camera Controls

### Tile Preview (Right Panel)
- **Click + Drag**: Rotate the tile to view from different angles
- Initial view: Looking down at 45° angle

### Game Board (Main View)
- **Click + Drag**: Rotate camera around the board
- **Ctrl/Cmd + Drag**: Pan the camera
- **Mouse Wheel**: Zoom in/out
- **Click**: Place tile (when edges match)
- Initial view: Isometric angle (45° rotation, looking down)

## Customization

To load custom GLTF models instead of procedural tiles, modify the `createMesh()` method in `Tile3D` class:

```javascript
// Load from GLTF file
const loader = new THREE.GLTFLoader();
loader.load('models/grass_tile_01.glb', (gltf) => {
    this.mesh = gltf.scene;
    // Apply rotation, position, etc.
});
```

## Tile Specifications

- **Size**: 1 unit (normalized)
- **Height**: ~0.5 units (including raised edges)
- **Origin**: Center of tile base
- **Rotation**: Around Y-axis (vertical)

## Performance Notes

- Models are loaded once and cloned for each placement
- Use optimized GLB files (< 100KB per tile recommended)
- Keep polygon count reasonable (< 5000 triangles per tile)
- Bake textures when possible

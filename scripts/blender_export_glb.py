"""
Blender headless exporter: FBX/OBJ/GLTF -> GLB

Usage (called by blender):
  blender -b --python scripts/blender_export_glb.py -- \
    --input path/to/model.fbx \
    --output path/to/model.glb \
    [--scale 1.0] [--apply-unit-scale]
"""

from __future__ import annotations

import argparse
import os
import sys


def _parse_args(argv: list[str]) -> argparse.Namespace:
    # Blender passes its own args; we only read the section after "--".
    if "--" not in argv:
        raise SystemExit("Expected '--' separating blender args and script args.")
    script_args = argv[argv.index("--") + 1 :]

    p = argparse.ArgumentParser()
    p.add_argument("--input", required=True, help="Input model path (fbx/obj/gltf/glb)")
    p.add_argument("--output", required=True, help="Output .glb path")
    p.add_argument("--scale", type=float, default=1.0, help="Uniform scale applied to imported objects")
    p.add_argument(
        "--apply-unit-scale",
        action="store_true",
        help="Apply scene unit scale (useful when FBX is authored in cm, etc.)",
    )
    return p.parse_args(script_args)


def _reset_scene() -> None:
    import bpy  # type: ignore

    bpy.ops.wm.read_factory_settings(use_empty=True)
    # Ensure we start clean
    for block in (
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.images,
        bpy.data.armatures,
        bpy.data.actions,
        bpy.data.textures,
    ):
        for b in list(block):
            try:
                block.remove(b)  # type: ignore[attr-defined]
            except Exception:
                pass


def _import_model(input_path: str) -> None:
    import bpy  # type: ignore

    ext = os.path.splitext(input_path)[1].lower()

    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=input_path, automatic_bone_orientation=True)
        return
    if ext == ".obj":
        bpy.ops.import_scene.obj(filepath=input_path)
        return
    if ext in (".gltf", ".glb"):
        bpy.ops.import_scene.gltf(filepath=input_path)
        return

    raise SystemExit(f"Unsupported input extension: {ext}")


def _apply_uniform_scale(scale: float) -> None:
    import bpy  # type: ignore

    if scale == 1.0:
        return

    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "ARMATURE", "EMPTY"}:
            obj.scale[0] *= scale
            obj.scale[1] *= scale
            obj.scale[2] *= scale


def _apply_transforms() -> None:
    import bpy  # type: ignore

    bpy.ops.object.select_all(action="DESELECT")
    for obj in bpy.context.scene.objects:
        if obj.type in {"MESH", "ARMATURE"}:
            obj.select_set(True)
    bpy.context.view_layer.objects.active = next(
        (o for o in bpy.context.scene.objects if o.type in {"MESH", "ARMATURE"}), None
    )
    # Apply scale/rotation (keeps animation data consistent for most FBX)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    bpy.ops.object.select_all(action="DESELECT")


def _configure_scene(apply_unit_scale: bool) -> None:
    import bpy  # type: ignore

    # glTF is Y-up; exporter can convert but keep scene sane
    bpy.context.scene.unit_settings.system = "METRIC"
    bpy.context.scene.unit_settings.scale_length = 1.0

    if apply_unit_scale:
        # Some FBX use centimeters (0.01m). This option lets you apply that manually
        # by adjusting scale in your wrapper command, but we keep this hook in case you
        # want to alter unit scale per batch.
        bpy.context.scene.unit_settings.scale_length = 1.0


def _export_glb(output_path: str) -> None:
    import bpy  # type: ignore

    os.makedirs(os.path.dirname(output_path) or ".", exist_ok=True)

    bpy.ops.export_scene.gltf(
        filepath=output_path,
        export_format="GLB",
        export_yup=True,
        export_apply=True,
        export_animations=True,
        export_skins=True,
        export_morph=True,
        export_materials="EXPORT",
        export_colors=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_image_format="AUTO",
    )


def main() -> None:
    args = _parse_args(sys.argv)
    input_path = os.path.abspath(args.input)
    output_path = os.path.abspath(args.output)

    if not os.path.exists(input_path):
        raise SystemExit(f"Input not found: {input_path}")

    _reset_scene()
    _configure_scene(apply_unit_scale=args.apply_unit_scale)
    _import_model(input_path)
    _apply_uniform_scale(args.scale)
    _apply_transforms()
    _export_glb(output_path)

    print(f"[ok] Exported GLB: {output_path}")


if __name__ == "__main__":
    main()

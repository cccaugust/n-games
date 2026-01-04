"""
Batch model converter (FBX/OBJ/GLTF -> GLB) using Blender headless.

Prereq:
  - blender installed (CLI)

Example:
  python3 scripts/convert_models.py \
    --input-dir "assets_src/animals" \
    --output-dir "public/games/animals-3d/assets/models" \
    --scale 1.0
"""

from __future__ import annotations

import argparse
import os
import subprocess
from pathlib import Path


SUPPORTED_EXTS = {".fbx", ".obj", ".gltf", ".glb"}


def parse_args() -> argparse.Namespace:
    p = argparse.ArgumentParser()
    p.add_argument("--input-dir", required=True, help="Directory containing source models")
    p.add_argument("--output-dir", required=True, help="Directory for output .glb files")
    p.add_argument("--scale", type=float, default=1.0, help="Uniform scale for all models")
    p.add_argument(
        "--overwrite",
        action="store_true",
        help="Overwrite existing outputs",
    )
    p.add_argument(
        "--dry-run",
        action="store_true",
        help="Print what would be converted without running Blender",
    )
    return p.parse_args()


def iter_models(input_dir: Path) -> list[Path]:
    models: list[Path] = []
    for path in input_dir.rglob("*"):
        if path.is_file() and path.suffix.lower() in SUPPORTED_EXTS:
            models.append(path)
    return sorted(models)


def to_output_path(input_path: Path, input_dir: Path, output_dir: Path) -> Path:
    rel = input_path.relative_to(input_dir)
    return (output_dir / rel).with_suffix(".glb")


def run_blender(input_path: Path, output_path: Path, scale: float) -> None:
    script_path = Path(__file__).with_name("blender_export_glb.py")
    cmd = [
        "blender",
        "-b",
        "--python",
        str(script_path),
        "--",
        "--input",
        str(input_path),
        "--output",
        str(output_path),
        "--scale",
        str(scale),
    ]
    subprocess.run(cmd, check=True)


def main() -> int:
    args = parse_args()
    input_dir = Path(args.input_dir).expanduser().resolve()
    output_dir = Path(args.output_dir).expanduser().resolve()

    if not input_dir.exists():
        print(f"[error] input dir not found: {input_dir}")
        return 2

    models = iter_models(input_dir)
    if not models:
        print(f"[warn] no supported model files found under: {input_dir}")
        return 0

    print(f"[info] found {len(models)} model(s)")
    for src in models:
        dst = to_output_path(src, input_dir, output_dir)
        if dst.exists() and not args.overwrite:
            print(f"[skip] {dst} (exists)  <- {src}")
            continue

        os.makedirs(dst.parent, exist_ok=True)
        print(f"[conv] {dst}  <- {src}")

        if args.dry_run:
            continue

        run_blender(src, dst, scale=args.scale)

    print("[ok] done")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())


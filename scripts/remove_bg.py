import sys
import os
from rembg import remove
from PIL import Image

def process_image(input_path, output_path):
    print(f"Processing: {input_path}")
    if not os.path.exists(input_path):
        print(f"Error: Input file not found: {input_path}")
        return

    try:
        input_image = Image.open(input_path)
        output_image = remove(input_image)
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        output_image.save(output_path)
        print(f"Successfully processed: {output_path}")
    except Exception as e:
        print(f"Error processing image: {e}")

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python remove_bg.py <input_path> <output_path>")
    else:
        process_image(sys.argv[1], sys.argv[2])

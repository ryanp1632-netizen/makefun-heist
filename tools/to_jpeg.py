"""Save a PNG screenshot as a JPEG under the bounty's 256 KiB cap (lowering quality only as needed)."""
import io, sys
from PIL import Image
src, dst = sys.argv[1], sys.argv[2]
img = Image.open(src).convert('RGB')
for q in (92, 88, 84, 80, 75, 70):
    buf = io.BytesIO()
    img.save(buf, 'JPEG', quality=q, optimize=True)
    if buf.tell() <= 255 * 1024:
        break
open(dst, 'wb').write(buf.getvalue())
print(dst, img.size, q, buf.tell())

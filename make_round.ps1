Add-Type -AssemblyName System.Drawing
$source = "c:\Users\spars\Music\portfolio\assets\images\pfp.jpeg"
$dest = "c:\Users\spars\Music\portfolio\assets\images\favicon.png"

$img = [System.Drawing.Image]::FromFile($source)
$min = [math]::Min($img.Width, $img.Height)
$bmp = New-Object System.Drawing.Bitmap $min, $min
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.Clear([System.Drawing.Color]::Transparent)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias

$path = New-Object System.Drawing.Drawing2D.GraphicsPath
$path.AddEllipse(0, 0, $min, $min)
$g.SetClip($path)

$x = [math]::Truncate(($img.Width - $min) / 2)
$y = [math]::Truncate(($img.Height - $min) / 2)

$rect = New-Object System.Drawing.Rectangle 0, 0, $min, $min
$srcRect = New-Object System.Drawing.Rectangle $x, $y, $min, $min

$g.DrawImage($img, $rect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
$bmp.Save($dest, [System.Drawing.Imaging.ImageFormat]::Png)

$g.Dispose()
$bmp.Dispose()
$img.Dispose()

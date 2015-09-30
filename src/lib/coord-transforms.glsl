vec2 screenSpaceToTexco(in vec2 screensPaceCoord, in vec2 bufferSize)
{
  return (screensPaceCoord + bufferSize * 0.5) / bufferSize;
}

vec2 toScreenSpaceCoord(in vec2 normalizedDeviceCoord, in vec2 bufferSize)
{
  return bufferSize * 0.5 * normalizedDeviceCoord;
}
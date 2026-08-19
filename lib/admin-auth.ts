export function isAuthorizedAdminRequest(request: Request): boolean {
  const secret = process.env.ADMIN_API_SECRET;
  if (!secret) {
    return false;
  }

  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    return false;
  }

  const token = header.slice('Bearer '.length);
  return token === secret;
}

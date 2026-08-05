// Jest ejecuta este archivo antes de cargar los módulos de cada test,
// asegurando que ConfigModule.forRoot() encuentre el entorno válido.
process.env.DATABASE_URL =
  'postgresql://test:test@localhost:5432/test?schema=public';
process.env.JWT_ACCESS_SECRET = 'a'.repeat(32);
process.env.JWT_REFRESH_SECRET = 'b'.repeat(32);
process.env.NODE_ENV = 'test';

import { User } from '../../domain/entities';

/**
 * Erro lançado quando as credenciais informadas não correspondem a nenhuma conta
 * conhecida pelo backend/mock de autenticação.
 */
export class InvalidCredentialsError extends Error {
  constructor(message = 'Usuário ou senha inválidos.') {
    super(message);
    this.name = 'InvalidCredentialsError';
  }
}

interface MockAccount {
  username: string;
  password: string;
  user: User;
}

/**
 * Contas controladas por um "backend" de autenticação mockado.
 *
 * Isto é um stand-in temporário até que o java-core exponha um endpoint real de
 * autenticação (ver issue #169, fora de escopo aqui). O ponto crítico de segurança
 * corrigido pela issue #316 é que o `role` do usuário autenticado SEMPRE vem deste
 * registro controlado do lado "servidor" — nunca é decidido pelo formulário de
 * login no cliente.
 */
const MOCK_ACCOUNTS: readonly MockAccount[] = [
  {
    username: 'vitor.tavares',
    password: 'secretpassword',
    user: {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      username: 'vitor.tavares',
      email: 'vitor.tavares@company.com',
      firstName: 'Vitor',
      lastName: 'Tavares',
      status: 'ACTIVE',
      role: 'ROLE_ADMIN',
    },
  },
  {
    username: 'demo.user',
    password: 'demo1234',
    user: {
      id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a12',
      username: 'demo.user',
      email: 'demo.user@company.com',
      firstName: 'Demo',
      lastName: 'User',
      status: 'ACTIVE',
      role: 'ROLE_USER',
    },
  },
];

export class AuthRepository {
  /**
   * Valida usuário e senha contra o backend/mock controlado. Resolve com o
   * usuário autenticado (role incluso) em caso de sucesso; rejeita com
   * InvalidCredentialsError caso contrário. Nunca aceita um `role` vindo do
   * chamador — o role sempre é derivado da conta encontrada no "servidor".
   */
  async login(username: string, password: string): Promise<User> {
    const account = MOCK_ACCOUNTS.find(
      (acc) => acc.username === username && acc.password === password
    );

    if (!account) {
      throw new InvalidCredentialsError();
    }

    return { ...account.user };
  }
}

export const authRepository = new AuthRepository();

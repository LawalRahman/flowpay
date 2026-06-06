import { BadRequestException, Injectable } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

export interface User {
  id: string
  email: string
  walletAddress?: string
}

@Injectable()
export class AuthService {
  private users: Map<string, { email: string; password: string; id: string }> = new Map()

  constructor(private jwtService: JwtService) {}

  async register(email: string, password: string): Promise<{ user: User; token: string }> {
    if (this.users.has(email)) {
      throw new BadRequestException('User already exists')
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const id = Math.random().toString(36).substring(7)

    this.users.set(email, {
      email,
      password: hashedPassword,
      id,
    })

    const token = this.jwtService.sign({ email, sub: id })

    return {
      user: { id, email },
      token,
    }
  }

  async login(email: string, password: string): Promise<{ user: User; token: string }> {
    const user = this.users.get(email)

    if (!user) {
      throw new BadRequestException('Invalid credentials')
    }

    const passwordMatch = await bcrypt.compare(password, user.password)

    if (!passwordMatch) {
      throw new BadRequestException('Invalid credentials')
    }

    const token = this.jwtService.sign({ email, sub: user.id })

    return {
      user: { id: user.id, email },
      token,
    }
  }

  async validateUser(email: string): Promise<User | null> {
    const user = this.users.get(email)
    return user ? { id: user.id, email: user.email } : null
  }
}

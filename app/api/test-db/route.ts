import { NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function GET() {
  try {
    // Test koneksi database dengan query sederhana
    await prisma.$connect()
    
    // Query untuk mengecek koneksi
    const result = await prisma.$queryRaw`SELECT 1 as test`
    
    await prisma.$disconnect()

    return NextResponse.json({
      success: true,
      message: 'Database connection successful',
      data: result
    })
  } catch (error) {
    console.error('Database connection error:', error)
    await prisma.$disconnect()
    
    return NextResponse.json(
      {
        success: false,
        message: 'Database connection failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}
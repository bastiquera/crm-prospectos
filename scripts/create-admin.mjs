// ============================================================
// Script para crear el usuario ADMIN en Supabase
// Uso: node scripts/create-admin.mjs
// ============================================================
import { createClient } from '@supabase/supabase-js'

// Configura estas variables con tus credenciales de Supabase
const SUPABASE_URL      = process.env.NEXT_PUBLIC_SUPABASE_URL      || 'TU_SUPABASE_URL'
const SERVICE_ROLE_KEY  = process.env.SUPABASE_SERVICE_ROLE_KEY      || 'TU_SERVICE_ROLE_KEY'

// ─── CONFIGURAR AQUÍ ──────────────────────────────────────
const ADMIN_EMAIL    = process.argv[2] || 'admin@crmpro.com'
const ADMIN_PASSWORD = process.argv[3] || 'Admin1234!'
const ADMIN_NAME     = process.argv[4] || 'Administrador'
// ──────────────────────────────────────────────────────────

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function createAdmin() {
  console.log(`\n📧 Creando admin: ${ADMIN_EMAIL}`)

  const { data, error } = await supabase.auth.admin.createUser({
    email:          ADMIN_EMAIL,
    password:       ADMIN_PASSWORD,
    email_confirm:  true,
    user_metadata:  { full_name: ADMIN_NAME, role: 'admin' },
  })

  if (error) {
    console.error('❌ Error al crear usuario:', error.message)
    process.exit(1)
  }

  console.log(`✅ Usuario auth creado: ${data.user.id}`)

  // Force role = admin in profiles table
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'admin', color_bg: '#6366F1', color_name: 'Indigo', color_light: '#EEF2FF' })
    .eq('id', data.user.id)

  if (profileError) {
    console.error('⚠️  Profile update error:', profileError.message)
  } else {
    console.log('✅ Perfil actualizado con role = admin')
  }

  console.log('\n═══════════════════════════════════════')
  console.log('  ADMIN CREADO EXITOSAMENTE')
  console.log('═══════════════════════════════════════')
  console.log(`  Email:      ${ADMIN_EMAIL}`)
  console.log(`  Contraseña: ${ADMIN_PASSWORD}`)
  console.log(`  Nombre:     ${ADMIN_NAME}`)
  console.log('═══════════════════════════════════════\n')
}

createAdmin()

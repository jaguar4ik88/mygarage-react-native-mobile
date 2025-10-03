#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const podfilePath = path.join(__dirname, '..', 'ios', 'Podfile');

if (fs.existsSync(podfilePath)) {
  let content = fs.readFileSync(podfilePath, 'utf8');
  
  // Проверяем, есть ли уже use_modular_headers!
  if (!content.includes('use_modular_headers!')) {
    // Добавляем use_modular_headers! после use_expo_modules!
    content = content.replace(
      /use_expo_modules!\s*\n/,
      'use_expo_modules!\n  use_modular_headers!\n'
    );
    
    fs.writeFileSync(podfilePath, content);
    console.log('✅ Added use_modular_headers! to Podfile');
  } else {
    console.log('✅ use_modular_headers! already exists in Podfile');
  }
} else {
  console.log('❌ Podfile not found');
}

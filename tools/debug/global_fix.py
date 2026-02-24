
import os

files_to_fix = [
    r'd:\Google_Antigravity_project\Mini_Game\Mini_Game\apps\soybean-admin\src\views\games\game-instance\components\ConfigForm.vue',
    r'd:\Google_Antigravity_project\Mini_Game\Mini_Game\apps\api\src\modules\seed\seed.service.ts'
]

# Mapping mangled Latin-1 interpreted UTF-8 back to correct characters
# Added more variants and common patterns
replacements = {
    'ðŸŽ ': '🎁',
    'ðŸŽ¯': '🎯',
    'ðŸ“œ': '📜',
    'ðŸŽ¨': '🎨',
    'ðŸ§ ': '🧠',
    'ðŸ”—': '🔗',
    'ðŸ“¦': '📦',
    'âœ ✨': '✨',
    'âš™ï¸ ': '⚙️',
    'ðŸ’°': '💰',
    'ðŸ’¡': '💡',
    'ðŸ“§': '📧',
    'âšª': '⚪',
    'ðŸŽ‰': '🎉',
    'ðŸŽŠ': '🎊',
    'ðŸŽˆ': '🎈',
    'â­ ': '⭐',
    'ðŸŒ🌟': '🌟',
    'ðŸ’«': '💫',
    'â ¤ï¸ ': '❤️',
    'ðŸ †': '🏆',
    'ðŸ’Ž': '💎',
    'ðŸ”¥': '🔥',
    'ðŸ¤‘': '🤑',
    'ðŸ‘ ': '👍',
    'ðŸ˜¢': '😢',
    'ðŸ˜…': '😅',
    'ðŸ§¨': '🧨',
    'ðŸ ·ï¸ ': '🎟️',
    'ðŸŽŸï¸ ': '🎟️',
    'ðŸ•¹ï¸ ': '🕹️',
    'ðŸ–¼ï¸ ': '🖼️',
    'âœ•': '✖',
    'âœ✓': '✓',
    'âš–ï¸ ': '⚖️',
    'â Œ': '❌',
    'ðŸ ¬': '🍬',
    'ðŸ ª': '🍪',
    'ðŸ «': '巧克力', # Chocolate
    'ðŸ °': '🍰',
    'ðŸ™‹â€ ™ï¸ ': '🙋‍♂️',
    'ðŸ“Š': '📊',
    'ðŸ¥‰': '🥉',
    'ðŸ¥ˆ': '🥈',
    'ðŸ¥‡': '🥇',
    'èµ›å šæœ‹å…‹': '赛博朋克',
    'æ  ç¤º': '提示',
    'ç´ æ  ä¸Šä¼ æˆ åŠŸ': '素材上传成功',
    'å¥–å“ é… ç½®': '奖品配置',
    'âŒ': ' ', # Clean up trailing garbage if any
    'Ã—': '×',
    'â†’': '→'
}

for file_path in files_to_fix:
    if not os.path.exists(file_path):
        print(f"Skipping missing file: {file_path}")
        continue
        
    try:
        # Read as bytes to handle raw mangled sequences
        with open(file_path, 'rb') as f:
            content_bytes = f.read()
        
        # Try decoding as latin-1 to get the string representation of mangled bytes
        text = content_bytes.decode('latin-1')
        
        # Apply replacements
        for bad, good in replacements.items():
            text = text.replace(bad, good)
            
        # Also handle standard mojibake combinations that might be nested
        # e.g. UTF-8 encoded twice by mistake
        
        # Save back as clean UTF8
        with open(file_path, 'w', encoding='utf-8', newline='') as f:
            f.write(text)
            
        print(f"FIXED: {file_path}")
        
    except Exception as e:
        print(f"FAILED {file_path}: {str(e)}")

print("Global cleanup complete.")

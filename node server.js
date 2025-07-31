const express = require('express');
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');
const fs = require('fs');
const cors = require('cors');

const app = express();

// Enable CORS for your website
app.use(cors({
    origin: ['http://localhost:3000', 'https://your-website.com'],
    credentials: true
}));

// Configure multer for file uploads
const upload = multer({ 
    dest: 'uploads/',
    limits: {
        fileSize: 8 * 1024 * 1024, // 8MB limit
        files: 10 // Max 10 files
    }
});

// Your Discord webhook URLs - UPDATE THESE!
const TEXT_WEBHOOK_URL = 'https://discord.com/api/webhooks/1312519842829549264/wokEy-9DqZ6LqqWXGBsmoVVwvK7EypaoJzmbFIZ5c-rOtSPq2oEUdmmUYPW9ddw-0Imz';
const IMAGE_WEBHOOK_URL = 'https://discord.com/api/webhooks/1399792064329285754/ZZyDaJR4Pp39mm4AVnwmz6oSTTM8VC3leiF54mNGnXbOQTZDRe_7d0nvo9P4AzKxCNaY';

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Handle clan application submission
app.post('/submit-application', upload.array('images', 10), async (req, res) => {
    try {
        console.log('📋 New application received:', req.body.rsn);
        
        const {
            rsn, discordUsername, totalLevel, combatLevel, questPoints,
            magicLevel, rangedLevel, constructionLevel, herbloreLevel,
            fireCape, coxKc, tobKc, toaKc, totalRaidKc,
            augury, piety, rigour, whyJoin, howHeard
        } = req.body;
        
        const uploadedFiles = req.files || [];
        console.log(`📸 ${uploadedFiles.length} files uploaded`);

        // Create Discord embed for application
        const embed = {
            title: "🔥 New Ignite Clan Application",
            color: 16744448, // Orange
            description: `New application from **${rsn}**\\n\\n**Application ID:** APP-${Date.now()}`,
            fields: [
                { name: "👤 RSN", value: rsn || "Not provided", inline: true },
                { name: "💬 Discord", value: discordUsername || "Not provided", inline: true },
                { name: "📊 Total Level", value: totalLevel || "Not provided", inline: true },
                { name: "⚔️ Combat Level", value: combatLevel || "Not provided", inline: true },
                { name: "📜 Quest Points", value: questPoints || "Not provided", inline: true },
                { name: "🔮 Magic Level", value: magicLevel || "Not provided", inline: true },
                { name: "🏹 Ranged Level", value: rangedLevel || "Not provided", inline: true },
                { name: "🏠 Construction", value: constructionLevel || "Not provided", inline: true },
                { name: "🧪 Herblore", value: herbloreLevel || "Not provided", inline: true },
                { name: "🔥 Fire Cape", value: fireCape || "Not specified", inline: true },
                { name: "🏛️ Chambers KC", value: coxKc || "0", inline: true },
                { name: "🎭 Theatre KC", value: tobKc || "0", inline: true },
                { name: "🏺 Tombs KC", value: toaKc || "0", inline: true },
                { name: "🎯 Total Raid KC", value: totalRaidKc || "0", inline: true },
                { name: "📿 Augury", value: augury || "Not specified", inline: true },
                { name: "⚔️ Piety", value: piety || "Not specified", inline: true },
                { name: "🏹 Rigour", value: rigour || "Not specified", inline: true }
            ],
            footer: {
                text: "Ignite Clan Application • React with ✅ to approve, ❌ to deny",
                icon_url: "https://imgur.com/u2cvtkN.png"
            },
            timestamp: new Date().toISOString()
        };

        // Add longer text fields
        if (whyJoin && whyJoin.trim()) {
            embed.fields.push({
                name: "💭 Why join Ignite?",
                value: whyJoin.substring(0, 1024),
                inline: false
            });
        }

        if (howHeard && howHeard !== 'Select an option') {
            embed.fields.push({
                name: "📢 How did you hear about us?",
                value: howHeard,
                inline: false
            });
        }

        if (uploadedFiles.length > 0) {
            embed.fields.push({
                name: "📸 Screenshots",
                value: `${uploadedFiles.length} files uploaded - check images channel`,
                inline: false
            });
        }

        // Send application text to Discord
        console.log('📤 Sending application to Discord...');
        const textResponse = await fetch(TEXT_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: `🔥 **New Clan Application Received!**`,
                embeds: [embed]
            })
        });

        if (!textResponse.ok) {
            throw new Error(`Text webhook failed: ${textResponse.status}`);
        }

        // Send images to Discord if any were uploaded
        if (uploadedFiles.length > 0) {
            console.log('📸 Uploading images to Discord...');
            
            for (const file of uploadedFiles) {
                try {
                    const form = new FormData();
                    form.append('file', fs.createReadStream(file.path), file.originalname);
                    form.append('payload_json', JSON.stringify({
                        content: `**📸 Screenshot from ${rsn}'s application**\\n*${file.originalname}*`,
                        username: 'Ignite Applications'
                    }));

                    const imageResponse = await fetch(IMAGE_WEBHOOK_URL, {
                        method: 'POST',
                        body: form
                    });

                    if (imageResponse.ok) {
                        console.log(`✅ Uploaded: ${file.originalname}`);
                    } else {
                        console.error(`❌ Failed to upload: ${file.originalname}`);
                    }

                    // Clean up uploaded file
                    fs.unlinkSync(file.path);
                } catch (fileError) {
                    console.error(`Error uploading ${file.originalname}:`, fileError);
                    // Clean up file even if upload failed
                    try { fs.unlinkSync(file.path); } catch {}
                }
            }
        }

        console.log('✅ Application processed successfully');
        res.json({ 
            success: true, 
            message: 'Application submitted successfully!',
            filesUploaded: uploadedFiles.length
        });

    } catch (error) {
        console.error('❌ Error processing application:', error);
        
        // Clean up any uploaded files on error
        if (req.files) {
            req.files.forEach(file => {
                try { fs.unlinkSync(file.path); } catch {}
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: 'Failed to submit application: ' + error.message 
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔥 Ignite Clan Server running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/health`);
});
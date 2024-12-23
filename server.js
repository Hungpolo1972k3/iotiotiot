const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const http = require('http');
const socketIo = require('socket.io');

// Tạo ứng dụng Express
const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Cấu hình Multer để lưu ảnh tải lên
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Cấu hình thư mục public để phục vụ các file tĩnh (HTML, CSS, JS)
app.use(express.static('public'));

// Tọa độ mặc định nếu không có tọa độ hợp lệ
const defaultCoordinates = [10, 10, 200, 200]; // [x1, y1, x2, y2]

// Xử lý yêu cầu tải lên ảnh và thông tin tọa độ
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }

    const imageBuffer = req.file.buffer;
    let coordinates = req.body.coords;

    // Kiểm tra và xử lý tọa độ, nếu không hợp lệ thì dùng tọa độ mặc định
    if (!coordinates || coordinates.length !== 8) {
        console.log('Invalid or missing coordinates, using default coordinates');
        coordinates = defaultCoordinates; // Sử dụng tọa độ mặc định
    } else {
        coordinates = JSON.parse(coordinates); // Chuyển tọa độ thành mảng số
    }

    // Xử lý ảnh và vẽ border hình chữ nhật
    sharp(imageBuffer)
        .resize(1000, 1000) // Resize ảnh nếu cần
        .composite([{
            input: Buffer.from(`
                <svg width="1000" height="1000">
                    <rect x="${coordinates[0]}" y="${coordinates[1]}" width="${coordinates[2] - coordinates[0]}" height="${coordinates[3] - coordinates[1]}" fill="rgba(255, 0, 0, 0.5)" />
                </svg>
            `),
            top: 0,
            left: 0
        }]) // Chèn hình chữ nhật lên ảnh
        .toBuffer()
        .then(data => {
            res.type('image/png');
            res.send(data); // Gửi ảnh đã chỉnh sửa về client
        })
        .catch(err => {
            console.error(err);
            res.status(500).send('Error processing image');
        });
});

// Cấu hình Socket.io
io.on('connection', (socket) => {
    console.log('A user connected');

    socket.on('sendImageData', (data) => {
        // Xử lý dữ liệu khi nhận được từ client
        // (Ví dụ: ảnh và tọa độ) và gửi lại ảnh có border
        console.log(data);
        socket.emit('displayImage', data); // Gửi lại ảnh đã xử lý cho client
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});
app.get('*', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

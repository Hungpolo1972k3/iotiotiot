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

// Xử lý yêu cầu tải lên ảnh và thông tin tọa độ
app.post('/upload', upload.single('image'), (req, res) => {
    if (!req.file) {
        return res.status(400).send('No file uploaded');
    }
    
    const imageBuffer = req.file.buffer;
    const { coords } = req.body; // Tọa độ 4 điểm gửi từ client
    
    if (!coords || coords.length !== 8) {
        return res.status(400).send('Invalid coordinates');
    }

    const coordinates = JSON.parse(coords); // Chuyển tọa độ thành mảng số

    // Xử lý ảnh và vẽ border hình chữ nhật
    sharp(imageBuffer)
        .overlayWith(createRectangle(coordinates), { gravity: sharp.gravity.center }) // Vẽ hình chữ nhật lên ảnh
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

// Hàm tạo ảnh hình chữ nhật từ tọa độ
function createRectangle(coords) {
    const { x1, y1, x2, y2 } = coords;

    const canvas = Buffer.alloc(1000 * 1000); // Tạo canvas tạm
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = 'rgba(255, 0, 0, 0.5)'; // Màu border đỏ trong suốt
    ctx.fillRect(x1, y1, x2 - x1, y2 - y1); // Vẽ hình chữ nhật
    return canvas;
}

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

// Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

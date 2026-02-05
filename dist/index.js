"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const passport_1 = __importDefault(require("passport"));
const registration_1 = __importDefault(require("./auth/registration"));
const login_1 = __importDefault(require("./auth/login"));
const google_1 = __importDefault(require("./auth/google"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const viewRoutes_1 = __importDefault(require("./routes/viewRoutes"));
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json());
app.use(passport_1.default.initialize());
app.use('/auth', registration_1.default);
app.use('/auth', login_1.default);
app.use('/auth', google_1.default);
app.use('/api/documents', documentRoutes_1.default);
app.use('/api/view', viewRoutes_1.default);
app.get('/', (req, res) => {
    res.send('Docusafe API is running');
});
app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});
//# sourceMappingURL=index.js.map
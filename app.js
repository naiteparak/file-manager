import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import os from 'node:os';
import zlib from 'node:zlib';
import { stdin, stdout } from 'node:process';
import { createHash } from 'node:crypto';
import { getUsername } from "./src/utils/getUsername.js";

class FileManager {

    constructor() {
        this.username = getUsername();
        this.homeDir = os.homedir();
        this.currentDir = this.homeDir;
    };

    writeCurrentDir() {
        stdout.write(`You are currently in ${this.currentDir}\n`)
    };

    writeError(){
        stdout.write('Operation failed\n');
    };

    start(){
        process.chdir(this.currentDir);
        stdout.setEncoding('utf-8').write(`\nWelcome to the File Manager, ${this.username}!\n`);
        this.writeCurrentDir();
        stdin.setEncoding('utf-8').resume(this.operations());
        process.on('uncaughtException', (err, origin) => {
            this.writeError();
            this.writeCurrentDir();
        });
        process.on('SIGINT', () => process.exit(0));
        process.on('exit', () => console.log(`\nThank you for using File Manager, ${this.username}, goodbye!`));
    };

    operations(){
        stdin.on('data', (data) =>{
            data = data.trim();
            if (data === 'up') {
                this.up();
            } else if (data.startsWith('cd')) {
                this.cd(data);
            } else if (data === 'ls') {
                this.ls();
            } else if (data.startsWith('cat')) {
                this.cat(data);
            } else if (data.startsWith('add')) {
                this.add(data);
            } else if (data.startsWith('rn')) {
                this.rn(data);
            } else if (data.startsWith('cp')) {
                this.cp(data);
            } else if (data.startsWith('mv')) {
                this.mv(data);
            } else if (data.startsWith('rm')) {
                this.rm(data);
            } else if (data.startsWith('os')) {
                this.os(data);
            } else if (data.startsWith('hash')) {

                this.hash(data);
            } else if (data.startsWith('compress')) {
                this.compress(data);
            } else if (data.startsWith('decompress')) {
                this.decompress(data);
            } else if (data === '.exit') {
                process.exit(0);
            } else {
                this.writeError();
                this.writeCurrentDir();
            };
        });
    };

    //up
    up(){
        try {
            if(this.homeDir === this.currentDir){
                this.writeCurrentDir();
            } else {
                this.currentDir = path.join(this.currentDir, '..');
                process.chdir(this.currentDir);
                this.writeCurrentDir()
            }
        } catch {
            this.writeError();
            this.writeCurrentDir();
        };
    };

    //cd path_to_directory || absolute_path
    async cd(cdPath){
        try {
            let pathToDir = cdPath.split('cd ');
            pathToDir = await path.resolve(this.currentDir, pathToDir[1]);
            await fs.stat(pathToDir, (err, stats)=>{
                if(err) this.writeError();
                else if(fs.existsSync(pathToDir) && stats.isDirectory()){
                    this.currentDir = pathToDir;
                    process.chdir(this.currentDir);
                    this.writeCurrentDir();
                } else {
                    this.writeError();
                };
            });
        } catch {
            this.writeError();
            this.writeCurrentDir();
        };
    };

    //ls
    ls(){
        try {
            const methods = ['isDirectory',  'isFile'];
            const res = fs.readdirSync(this.currentDir, { withFileTypes: true }).map(file => {
                let cur = { Name: file.name };
                for (const method of methods) cur[method] = file[method]();
                return cur;
            }).sort((a, b) => Number(b.isDirectory) - Number(a.isDirectory))
            console.table(res);
            this.writeCurrentDir();
        } catch (err) {
            this.writeError();
            this.writeCurrentDir();
        };
    };


    //cat path_to_file
    async cat(catPath){
        const pathToFile = catPath.split('cat ');
        const absolutePath = pathToFile[1];
        const readableStream = fs.createReadStream(absolutePath);
        readableStream
            .on('error', () => {
                this.writeError();
                this.writeCurrentDir();
            })
            .on('data', (chunk) => {
                stdout.write(chunk + '\n');
                this.writeCurrentDir();
            });
    };

    //add new_file_name
    async add(fileName){
        fileName = fileName.split('add ');
        const absolutePath = await path.resolve(this.currentDir, fileName[1]);
        await fs.writeFile(absolutePath, '', {flag: 'wx'}, (err) => {
            if (err && err.code === 'EEXIST') {
                this.writeError();
                this.writeCurrentDir();
            }
        });
        this.writeCurrentDir();
    };

    //rn path_to_file new_filename
    async rn(data){
        data = data.split(' ');
        const pathToFile = data[1];
        const filename = path.basename(pathToFile);
        const newFilename = path.resolve(data[1].replace(filename, data[2]));
        if (fs.existsSync(pathToFile) && !fs.existsSync(newFilename)) {
            await fs.rename(pathToFile, newFilename, (err) => {
                if (err) {
                    this.writeError();
                    this.writeCurrentDir();
                } else this.writeCurrentDir();
            });
        } else  {
            this.writeError();
            this.writeCurrentDir();
        };
    };

    //cp path_to_file path_to_new_directory
    cp(data) {
        data = data.split(' ');
        const source = data[1];
        const fileName = path.basename(source);
        const destination = path.resolve(data[2], fileName);
        if (fs.existsSync(source) && !fs.existsSync(destination)) {
            fs.createReadStream(source).pipe(fs.createWriteStream(destination));
            this.writeCurrentDir();
        } else  {
            this.writeError();
            this.writeCurrentDir();
        };
    };

    //mv path_to_file path_to_new_directory
    mv(data) {
        data = data.split(' ');
        const source = data[1];
        const fileName = path.basename(source);
        const destination = path.resolve(data[2], fileName);
        if (fs.existsSync(source) && !fs.existsSync(destination)) {
            fs.createReadStream(source).pipe(fs.createWriteStream(destination));
            fs.rm(source, (err) => {
                if(err){
                    this.writeError();
                    this.writeCurrentDir();
                };
            });
            this.writeCurrentDir();
        } else  {
            this.writeError();
            this.writeCurrentDir();
        };
    };

    //rm path_to_file
    async rm(data){
        data = data.split('rm ');
        const filePath = data[1];
        await fs.rm(filePath, (err) => {
            if(err){
                this.writeError();
                this.writeCurrentDir();
            };
        });
        this.writeCurrentDir();
    };

    os(data){
        data = data.split('os ')[1];
        if(data === '--EOL'){ //os --EOL
            console.log(JSON.stringify(os.EOL));
            this.writeCurrentDir();
        } else if(data === '--cpus'){ //os --cpus
            console.log(os.cpus());
            this.writeCurrentDir();
        } else if(data === '--homedir'){ //os --homedir
            console.log(os.homedir());
            this.writeCurrentDir();
        } else if(data === '--username'){ //os --username
            console.log(os.userInfo().username);
            this.writeCurrentDir();
        } else if(data === '--architecture'){ //os --architecture
            console.log(os.arch());
            this.writeCurrentDir();
        } else {
            this.writeError();
            this.writeCurrentDir();
        };
    };

    //hash path_to_file
    async hash(data){
        const filePath = data.split('hash ')[1];
        await fs.readFile(filePath, (err, data) => {
            if (err) {
                this.writeError();
                this.writeCurrentDir();
            };
            const hash = createHash('sha256');
            const hex = hash.update(data).digest('hex');
            console.log(hex);
            this.writeCurrentDir();
        });
    };

    //compress path_to_file path_to_destination
    compress(data){
        data = data.split(' ');
        const filePath = data[1];
        const filename = path.basename(filePath);
        const destinationPath = path.join(data[2], filename) + '.br';
        const readStream = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(destinationPath);
        const brotli = zlib.createBrotliCompress();
        const stream = readStream.pipe(brotli).pipe(writeStream);
        stream.on('finish', () => {
            this.writeCurrentDir();
        });
        stream.on('error', (err) => {
            this.writeError();
            this.writeCurrentDir();
        });
    };

    //decompress path_to_file path_to_destination
    decompress(data){
        data = data.split(' ');
        const filePath = data[1];
        const filename = path.parse(filePath).name;
        const destinationPath = path.resolve(data[2], filename);
        const readStream = fs.createReadStream(filePath);
        const writeStream = fs.createWriteStream(destinationPath);
        const brotli = zlib.createBrotliDecompress();
        const stream = readStream.pipe(brotli).pipe(writeStream);
        stream.on('finish', () => {
            this.writeCurrentDir();
        });
        stream.on('error', (err) => {
            this.writeError();
            this.writeCurrentDir();
        });
    };
};

const fileManager = new FileManager();
fileManager.start();

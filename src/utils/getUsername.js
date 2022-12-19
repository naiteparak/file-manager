import { argv } from 'node:process';
const args = argv.slice(2)

export function getUsername(){
    let username
    if(args.length === 1){
        args
            .forEach(element =>{
                if(element.startsWith('--')){
                    username = element.split('=')[1]
                } else {
                    return 'Operation failed';
                }
            })
    } else {
        return 'Operation failed';
    }
    return  username;
}


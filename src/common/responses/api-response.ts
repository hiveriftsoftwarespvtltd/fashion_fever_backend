export class ApiResponse<T>{
    success:boolean;
    statusCode:number;
    message:string;
    data?:T;

    constructor(success:boolean,statusCode:number,message:string,data?:T){
        this.success=success;
        this.statusCode=statusCode;
        this.message=message;
        if(data !== undefined){
            this.data=data
        }
    }

    static success<T>(message:string,data?:T,statusCode=200){
        return new ApiResponse(true,statusCode,message,data)
    }

    static error<T>(message:string,statusCode=500){
        return new ApiResponse(false,statusCode,message)
    }
}
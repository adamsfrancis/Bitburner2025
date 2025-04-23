export class Job{
    jobType:string;
    jobTarget:string;

    constructor(jobType:string,jobTarget:string){
        this.jobType = jobType;
        this.jobTarget = jobTarget;
    }
}

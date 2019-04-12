import { Route, Response, Get, Post, Patch, Header, Body, Security, Controller, Path, Delete } from 'tsoa';
import { validate} from "class-validator";

import { IUserCreateRequest, IUserUpdateRequest} from '../request/index';
import { IUserResponse, IErrorResponse} from '../responses/index';
import { validateUserRegistration }   from "../../business-layer/validators/user/UserValidationProcessor";
import { createJwtToken } from '../../business-layer/security/token-helpers';

import { UserDataAgent } from '../../data-layer/data-agents/UserDataAgent';
import { UserModel } from '../../data-layer/models/UserModel';

import { logger } from '../../middleware/common/logging';


@Route('Users')
export class UsersController extends Controller{


    userDataAgent:UserDataAgent = new UserDataAgent();

    @Post()
    public async RegisterNewUser(@Body()  request: IUserCreateRequest): Promise<IUserResponse> {
       let vaildationErrors:any[] = await validateUserRegistration(request);
       logger.info('RegisterNewUser  vaildationErrors =', vaildationErrors)
       if(vaildationErrors.length>0){
          throw {
                 thrown:true,
                 status: 401,
                 message: "incorrect input",
                 data:vaildationErrors
                };
       }
       let newUserAttempt = await this.userDataAgent.createNewUser(request);
       if(newUserAttempt.id){
           const newUser = new UserModel(newUserAttempt);
           const loginResult = Object.assign(
           {account:{
                    user:newUser.getClientUserModel(),
                     token:createJwtToken( newUserAttempt.id)
                     }
              });
           return <IUserResponse>(loginResult);
       }else{

          throw newUserAttempt;

       }
    }


    @Security('api_key')
    @Get('{userId}')
    public async GetUserById(userId: string, @Header('x-access-token') authentication: string ): Promise<IUserResponse> {
       let result = await this.userDataAgent.getUserById(userId);
       if( result && result.userName){
              var aUser = new UserModel(result);
               return <IUserResponse>(aUser.getClientUserModel());
       }else{
          if(result){
              throw result;
          }else{

              throw{
                   thrown:true,
                   status: 404,
                   message: 'no such user exist'
              }

          }
       }
    }


    @Response<IErrorResponse>('404','no such user exist' )
    @Get('userName/{userName}')
    public async GetUserByUsername( @Path() userName: string): Promise<IUserResponse> {
        let result = await this.userDataAgent.getByUsername(userName)
        if( result && result.userName){
               var aUser = new UserModel(result);
               return <IUserResponse>( {user:aUser.getClientUserModel()});
        }else{
              throw result;
        }
    }


    @Patch()
    public async UpdateUser(@Body() request: IUserUpdateRequest ): Promise<IUserResponse> {
        let result = await this.userDataAgent.updateUser(request);
        if(result.id){
              var aUser = new UserModel(result);
               return <IUserResponse>(aUser.getClientUserModel());
        }else{
          throw result
        }
    }

}

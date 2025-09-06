import router from '@ohos.router';
import http from '@ohos.net.http';
import promptAction from '@ohos.promptAction';

@Entry
@Component
struct Register {
  @State private phoneNumber: string = '';
  @State private password: string = '';
  @State private confirmPassword: string = '';
  @State private nickname: string = '';
  @State private isLoading: boolean = false;
  @State private showPassword: boolean = false;
  @State private showConfirmPassword: boolean = false;

  async handleRegister() {
    if (!this.phoneNumber || !this.password || !this.confirmPassword) {
      promptAction.showToast({ message: '请填写所有必填项' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(this.phoneNumber)) {
      promptAction.showToast({ message: '请输入正确的手机号' });
      return;
    }

    if (this.password.length < 6) {
      promptAction.showToast({ message: '密码长度不能少于6位' });
      return;
    }

    if (this.password !== this.confirmPassword) {
      promptAction.showToast({ message: '两次输入的密码不一致' });
      return;
    }

    this.isLoading = true;
    
    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(
        'https://your-api-domain.com/api/auth/register',
        {
          method: http.RequestMethod.POST,
          header: {
            'Content-Type': 'application/json'
          },
          extraData: {
            phoneNumber: this.phoneNumber,
            password: this.password,
            nickname: this.nickname || this.phoneNumber
          }
        }
      );

      if (response.responseCode === 201) {
        const data = JSON.parse(response.result.toString());
        promptAction.showToast({ message: '注册成功' });
        
        // 注册成功后自动登录
        const loginResponse = await httpRequest.request(
          'https://your-api-domain.com/api/auth/login',
          {
            method: http.RequestMethod.POST,
            header: {
              'Content-Type': 'application/json'
            },
            extraData: {
              phoneNumber: this.phoneNumber,
              password: this.password
            }
          }
        );

        if (loginResponse.responseCode === 200) {
          const loginData = JSON.parse(loginResponse.result.toString());
          console.info('登录成功:', loginData.data.token);
          promptAction.showToast({ message: '登录成功' });
          router.replaceUrl({ url: 'pages/Index' });
        }
      } else {
        const error = JSON.parse(response.result.toString());
        promptAction.showToast({ message: error.error || '注册失败' });
      }
    } catch (error) {
      console.error('注册失败:', error);
      promptAction.showToast({ message: '网络错误，请检查网络' });
    } finally {
      this.isLoading = false;
    }
  }

  build() {
    Column() {
      // App Logo
      Column() {
        Text('月汐')
          .fontSize(48)
          .fontWeight(FontWeight.Bold)
          .fontColor('#E91E63')
          .margin({ bottom: 10 })
        
        Text('LunaX')
          .fontSize(24)
          .fontColor('#666')
      }
      .margin({ top: 60, bottom: 40 })

      // Register Form
      Column() {
        Text('注册')
          .fontSize(28)
          .fontWeight(FontWeight.Bold)
          .fontColor('#333')
          .margin({ bottom: 30 })

        // Phone Number Input
        TextInput({
          placeholder: '请输入手机号',
          text: this.phoneNumber
        })
          .width('100%')
          .height(50)
          .type(InputType.PhoneNumber)
          .border({
            width: 1,
            color: '#E0E0E0',
            radius: 25
          })
          .padding({ left: 20, right: 20 })
          .margin({ bottom: 20 })
          .onChange((value: string) => {
            this.phoneNumber = value;
          })

        // Nickname Input
        TextInput({
          placeholder: '请输入昵称（可选）',
          text: this.nickname
        })
          .width('100%')
          .height(50)
          .border({
            width: 1,
            color: '#E0E0E0',
            radius: 25
          })
          .padding({ left: 20, right: 20 })
          .margin({ bottom: 20 })
          .onChange((value: string) => {
            this.nickname = value;
          })

        // Password Input
        Row() {
          TextInput({
            placeholder: '请输入密码（至少6位）',
            text: this.password
          })
            .width('100%')
            .height(50)
            .type(this.showPassword ? InputType.Normal : InputType.Password)
            .border({
              width: 1,
              color: '#E0E0E0',
              radius: 25
            })
            .padding({ left: 20, right: 50 })
            .onChange((value: string) => {
              this.password = value;
            })

          Image(this.showPassword ? '/common/images/eye_open.png' : '/common/images/eye_close.png')
            .width(24)
            .height(24)
            .position({ right: 15 })
            .onClick(() => {
              this.showPassword = !this.showPassword;
            })
        }
        .width('100%')
        .margin({ bottom: 20 })

        // Confirm Password Input
        Row() {
          TextInput({
            placeholder: '请再次输入密码',
            text: this.confirmPassword
          })
            .width('100%')
            .height(50)
            .type(this.showConfirmPassword ? InputType.Normal : InputType.Password)
            .border({
              width: 1,
              color: '#E0E0E0',
              radius: 25
            })
            .padding({ left: 20, right: 50 })
            .onChange((value: string) => {
              this.confirmPassword = value;
            })

          Image(this.showConfirmPassword ? '/common/images/eye_open.png' : '/common/images/eye_close.png')
            .width(24)
            .height(24)
            .position({ right: 15 })
            .onClick(() => {
              this.showConfirmPassword = !this.showConfirmPassword;
            })
        }
        .width('100%')
        .margin({ bottom: 30 })

        // Register Button
        Button(this.isLoading ? '注册中...' : '注册')
          .width('100%')
          .height(50)
          .backgroundColor('#E91E63')
          .fontColor('#FFFFFF')
          .borderRadius(25)
          .fontSize(18)
          .enabled(!this.isLoading)
          .onClick(() => {
            this.handleRegister();
          })

        // Login Link
        Row() {
          Text('已有账号？')
            .fontSize(14)
            .fontColor('#666')
          Text('立即登录')
            .fontSize(14)
            .fontColor('#E91E63')
            .fontWeight(FontWeight.Bold)
            .onClick(() => {
              router.back();
            })
        }
        .margin({ top: 20 })
      }
      .width('80%')
    }
    .width('100%')
    .height('100%')
    .backgroundColor('#F5F5F5')
  }
}
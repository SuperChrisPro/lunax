import router from '@ohos.router';
import http from '@ohos.net.http';
import promptAction from '@ohos.promptAction';

@Entry
@Component
struct Login {
  @State private phoneNumber: string = '';
  @State private password: string = '';
  @State private isLoading: boolean = false;
  @State private showPassword: boolean = false;

  async handleLogin() {
    if (!this.phoneNumber || !this.password) {
      promptAction.showToast({ message: '请输入手机号和密码' });
      return;
    }

    if (!/^1[3-9]\d{9}$/.test(this.phoneNumber)) {
      promptAction.showToast({ message: '请输入正确的手机号' });
      return;
    }

    this.isLoading = true;
    
    const httpRequest = http.createHttp();
    try {
      const response = await httpRequest.request(
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

      if (response.responseCode === 200) {
        const data = JSON.parse(response.result.toString());
        
        // 保存token到本地存储
        // 实际项目中应该使用安全存储
        console.info('登录成功:', data.data.token);
        
        promptAction.showToast({ message: '登录成功' });
        router.replaceUrl({ url: 'pages/Index' });
      } else {
        const error = JSON.parse(response.result.toString());
        promptAction.showToast({ message: error.error || '登录失败' });
      }
    } catch (error) {
      console.error('登录失败:', error);
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
      .margin({ top: 80, bottom: 60 })

      // Login Form
      Column() {
        Text('登录')
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

        // Password Input
        Row() {
          TextInput({
            placeholder: '请输入密码',
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
        .margin({ bottom: 30 })

        // Login Button
        Button(this.isLoading ? '登录中...' : '登录')
          .width('100%')
          .height(50)
          .backgroundColor('#E91E63')
          .fontColor('#FFFFFF')
          .borderRadius(25)
          .fontSize(18)
          .enabled(!this.isLoading)
          .onClick(() => {
            this.handleLogin();
          })

        // Register Link
        Row() {
          Text('还没有账号？')
            .fontSize(14)
            .fontColor('#666')
          Text('立即注册')
            .fontSize(14)
            .fontColor('#E91E63')
            .fontWeight(FontWeight.Bold)
            .onClick(() => {
              router.pushUrl({ url: 'pages/Register' });
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